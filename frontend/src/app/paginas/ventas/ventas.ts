import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { VentaService } from '../../servicios/venta.service';
import { EmpleadoService } from '../../servicios/empleado.service';
import { ProductoService } from '../../servicios/producto.service';
import { CategoriaService } from '../../servicios/categoria.service';
import { Empleado } from '../../modelos/empleado.model';
import { Categoria } from '../../modelos/categoria.model';
import { Producto } from '../../modelos/producto.model';
import { MetodoPago } from '../../modelos/venta.model';

// Una línea del pedido que se está armando: el producto y cuántas unidades lleva.
interface ItemPedido {
  producto: Producto;
  cantidad: number;
}

// Pantalla del cajero (punto de venta). El flujo es:
//   1. Se elige un producto del menú -> se agrega al pedido (panel derecho).
//   2. Se ajustan cantidades, se elige método de pago (y, en efectivo, cuánto se recibió).
//   3. "Cobrar" envía la venta al backend, que la guarda y descuenta el stock.
// El historial y la edición de ventas están en otra página (historial-ventas).
@Component({
  selector: 'app-ventas',
  imports: [FormsModule, RouterLink],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css',
})
export class Ventas {
  private ventaService = inject(VentaService);
  private empleadoService = inject(EmpleadoService);
  private productoService = inject(ProductoService);
  private categoriaService = inject(CategoriaService);

  // --- Datos que vienen del backend ---
  categorias = signal<Categoria[]>([]);
  productos = signal<Producto[]>([]);
  empleados = signal<Empleado[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  // --- Filtros del menú ---
  // id de la categoría activa; null = "Todo".
  categoriaSeleccionada = signal<number | null>(null);
  // Texto escrito en el buscador (nombre o código de barras).
  busqueda = signal('');

  // --- El pedido en curso ---
  pedido = signal<ItemPedido[]>([]);
  // Cajero que registra la venta (de momento se elige a mano; cuando exista login saldrá de la sesión).
  idCajero = signal<number | null>(null);
  metodoPago = signal<MetodoPago>('efectivo');
  // Dinero entregado por el cliente (solo se usa en efectivo, para calcular el cambio).
  recibido = signal<number | null>(null);
  // En pantallas chicas el pedido es un panel que se abre/cierra; esto controla si está abierto.
  pedidoAbierto = signal(false);

  // --- Estado del cobro ---
  cobrando = signal(false);
  errorCobro = signal<string | null>(null);
  // Total de la última venta registrada; se muestra como mensaje de confirmación.
  ultimaVenta = signal<number | null>(null);

  // Productos que se muestran en el menú: pasan el filtro de categoría Y el del buscador.
  // Al ser `computed`, se recalcula solo cuando cambia cualquiera de los signals que usa.
  productosFiltrados = computed(() => {
    const idCategoria = this.categoriaSeleccionada();
    const texto = this.busqueda().trim().toLowerCase();
    return this.productos().filter(
      (p) =>
        (idCategoria === null || p.id_categoria === idCategoria) &&
        (texto === '' ||
          p.nombre.toLowerCase().includes(texto) ||
          // `?? ''` evita fallar con productos sin código de barras (null).
          (p.codigo_barras ?? '').toLowerCase().includes(texto)),
    );
  });

  // Total de unidades en el pedido (para el texto "Ver pedido (3)").
  cantidadEnPedido = computed(() => this.pedido().reduce((acc, i) => acc + i.cantidad, 0));
  // Total a cobrar = suma de (cantidad × precio) de cada línea.
  total = computed(() => this.pedido().reduce((acc, i) => acc + i.cantidad * i.producto.precio, 0));
  // Cambio a devolver; Math.max(0, ...) evita mostrar un cambio negativo.
  cambio = computed(() => Math.max(0, (this.recibido() ?? 0) - this.total()));
  // true si el pago es en efectivo y lo recibido no alcanza para cubrir el total.
  faltaPagar = computed(
    () => this.metodoPago() === 'efectivo' && (this.recibido() ?? 0) < this.total(),
  );

  constructor() {
    this.cargarDatos();
  }

  // Pide categorías, productos y empleados al backend. Se llama al abrir la página.
  async cargarDatos() {
    this.cargando.set(true);
    this.error.set(null);

    // Promise.all lanza las tres peticiones a la vez y espera a que terminen todas.
    const [categoriasRes, productosRes, empleadosRes] = await Promise.all([
      this.categoriaService.listar(),
      this.productoService.listar(),
      this.empleadoService.listar(),
    ]);

    // Se toma el primer error que exista (`??` pasa al siguiente si el anterior es null).
    const error = categoriasRes.error ?? productosRes.error ?? empleadosRes.error;
    if (error) {
      this.error.set(error);
      this.cargando.set(false);
      return;
    }

    this.categorias.set(categoriasRes.data);
    this.productos.set(productosRes.data);
    // Solo los empleados activos pueden figurar como cajero.
    const activos = empleadosRes.data.filter((e) => e.estado === 'activo');
    this.empleados.set(activos);
    // Si todavía no hay cajero elegido, se preselecciona el primero.
    if (this.idCajero() === null && activos.length > 0) {
      this.idCajero.set(activos[0].id);
    }
    this.cargando.set(false);
  }

  seleccionarCategoria(id: number | null) {
    this.categoriaSeleccionada.set(id);
  }

  // Un lector de códigos de barras "teclea" el código y manda Enter: si coincide exacto, se agrega.
  agregarPorCodigo() {
    const codigo = this.busqueda().trim();
    if (codigo === '') {
      return;
    }
    const producto = this.productos().find((p) => p.codigo_barras === codigo);
    if (producto) {
      this.agregar(producto);
      // Se limpia el buscador para poder escanear el siguiente producto.
      this.busqueda.set('');
    }
  }

  // Cuántas unidades de ese producto hay ya en el pedido (0 si no está).
  private enPedido(producto: Producto): number {
    return this.pedido().find((i) => i.producto.id === producto.id)?.cantidad ?? 0;
  }

  // true si ya no se puede agregar más de este producto (el pedido ya llegó al stock disponible).
  sinStock(producto: Producto): boolean {
    return this.enPedido(producto) >= producto.cantidad;
  }

  // Agrega una unidad del producto al pedido (o suma 1 si ya estaba).
  agregar(producto: Producto) {
    if (this.sinStock(producto)) {
      return;
    }
    // Al empezar un pedido nuevo se oculta el mensaje de la venta anterior.
    this.ultimaVenta.set(null);
    // `update` cambia el signal a partir de su valor anterior. Siempre se crea un arreglo NUEVO
    // (map / spread) en vez de modificar el existente, para que Angular detecte el cambio.
    this.pedido.update((items) =>
      items.some((i) => i.producto.id === producto.id)
        ? items.map((i) => (i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i))
        : [...items, { producto, cantidad: 1 }],
    );
  }

  // Resta una unidad; si llega a 0, la línea desaparece del pedido (el filter la descarta).
  restar(item: ItemPedido) {
    this.pedido.update((items) =>
      items
        .map((i) => (i.producto.id === item.producto.id ? { ...i, cantidad: i.cantidad - 1 } : i))
        .filter((i) => i.cantidad > 0),
    );
  }

  // Quita la línea completa, sin importar cuántas unidades llevara.
  quitar(item: ItemPedido) {
    this.pedido.update((items) => items.filter((i) => i.producto.id !== item.producto.id));
  }

  // Limpia el pedido y todo lo relacionado con el cobro (se usa al cancelar y tras cobrar).
  vaciar() {
    this.pedido.set([]);
    this.recibido.set(null);
    this.errorCobro.set(null);
    this.pedidoAbierto.set(false);
  }

  // Al cambiar de método de pago se borra el monto recibido para no arrastrar un valor viejo.
  cambiarMetodo(metodo: MetodoPago) {
    this.metodoPago.set(metodo);
    this.recibido.set(null);
  }

  // Registra la venta en el backend.
  async cobrar() {
    const idCajero = this.idCajero();
    // Protección extra: el botón ya está desactivado en estos casos, pero se revisa también aquí.
    if (this.pedido().length === 0 || this.faltaPagar()) {
      return;
    }
    if (idCajero === null) {
      this.errorCobro.set('Registra al menos un empleado activo en RH para poder cobrar.');
      return;
    }

    this.cobrando.set(true);
    this.errorCobro.set(null);

    const total = this.total();
    // Se envían dos cosas: el encabezado de la venta y sus líneas. El backend las guarda en una
    // sola transacción y descuenta el stock (ver backend/routes/ventas.js).
    const { error } = await this.ventaService.crear(
      {
        fecha: new Date().toISOString(),
        id_empleado: idCajero,
        subtotal: total,
        descuento: 0, // el descuento manual solo existe en el historial (administrador)
        total,
        metodo_pago: this.metodoPago(),
        estado: 'confirmada',
      },
      // Cada línea lleva el precio de ese momento (así el historial conserva lo que se cobró).
      this.pedido().map((i) => ({
        id_producto: i.producto.id,
        cantidad: i.cantidad,
        precio_unitario: i.producto.precio,
      })),
    );

    this.cobrando.set(false);

    // Si falló (por ejemplo, otro cajero vendió el último producto), el pedido se conserva
    // para poder corregirlo y reintentar.
    if (error) {
      this.errorCobro.set(error);
      return;
    }

    this.ultimaVenta.set(total);
    this.vaciar();
    // Recarga el stock que acaba de descontar la venta.
    const { data } = await this.productoService.listar();
    if (data.length > 0) {
      this.productos.set(data);
    }
  }
}
