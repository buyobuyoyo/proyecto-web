import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../componentes/modal/modal';
import { ProveedorService } from '../../servicios/proveedor.service';
import { CompraService } from '../../servicios/compra.service';
import { ProductoService } from '../../servicios/producto.service';
import { Proveedor, ProveedorInput } from '../../modelos/proveedor.model';
import { Compra, CompraInput, EstadoCompra } from '../../modelos/compra.model';
import { LineaCompraForm } from '../../modelos/detalle-compra.model';
import { Producto } from '../../modelos/producto.model';

// Una línea en blanco del formulario de compra (aún sin producto elegido).
function lineaVacia(): LineaCompraForm {
  return { id_producto: null, cantidad: 1, precio_unitario: 0 };
}

// Página de Compras (insumos): administra los proveedores y las órdenes de compra.
// Una compra tiene un encabezado (proveedor, fecha, estado) y varias líneas (producto, cantidad,
// precio). Al marcarla como 'recibida', el backend suma el stock y registra el gasto.
@Component({
  selector: 'app-compras',
  imports: [Modal, FormsModule],
  templateUrl: './compras.html',
  styleUrl: './compras.css',
})
export class Compras {
  private proveedorService = inject(ProveedorService);
  private compraService = inject(CompraService);
  private productoService = inject(ProductoService);

  // --- Datos que vienen del backend ---
  proveedores = signal<Proveedor[]>([]);
  compras = signal<Compra[]>([]);
  productos = signal<Producto[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  // --- Proveedor ---
  modalProveedorAbierto = signal(false);
  // Si hay un proveedor aquí, el formulario está EDITANDO; si es null, está CREANDO.
  proveedorEditando = signal<Proveedor | null>(null);
  formProveedor: ProveedorInput = { nombre: '', contacto: null };
  formErrorProveedor = signal<string | null>(null);
  guardandoProveedor = signal(false);

  // --- Compra ---
  modalCompraAbierto = signal(false);
  compraEditando = signal<Compra | null>(null);
  // Estado que tenía la compra al abrirla (el servicio lo pide, aunque el backend lo vuelve a leer).
  estadoOriginalCompra: EstadoCompra = 'pendiente';
  formCompra: CompraInput = this.compraVacia();
  // Las líneas del formulario viven en un signal (arreglo) porque se agregan y quitan filas.
  lineas = signal<LineaCompraForm[]>([lineaVacia()]);
  formErrorCompra = signal<string | null>(null);
  guardandoCompra = signal(false);

  // Total de la compra = suma de (cantidad × precio unitario) de cada línea.
  // Al ser `computed`, se recalcula solo cada vez que cambian las líneas.
  totalCompra = computed(() =>
    this.lineas().reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0),
  );

  constructor() {
    this.cargarDatos();
  }

  // Valores iniciales de una compra nueva: fecha de hoy y estado pendiente.
  private compraVacia(): CompraInput {
    return {
      fecha: new Date().toISOString().slice(0, 10),
      id_proveedor: 0,
      total: 0,
      estado: 'pendiente',
    };
  }

  // Pide proveedores, compras y productos al backend. Se llama al abrir la página y después
  // de cada cambio para refrescar la pantalla con lo que quedó en la base.
  async cargarDatos() {
    this.cargando.set(true);
    this.error.set(null);

    // Promise.all lanza las tres peticiones a la vez y espera a que terminen todas.
    const [proveedoresRes, comprasRes, productosRes] = await Promise.all([
      this.proveedorService.listar(),
      this.compraService.listar(),
      this.productoService.listar(),
    ]);

    // Se toma el primer error que exista (`??` pasa al siguiente si el anterior es null).
    const error = proveedoresRes.error ?? comprasRes.error ?? productosRes.error;
    if (error) {
      this.error.set(error);
      this.cargando.set(false);
      return;
    }

    this.proveedores.set(proveedoresRes.data);
    this.compras.set(comprasRes.data);
    this.productos.set(productosRes.data);
    this.cargando.set(false);
  }

  // Busca el nombre de un producto por su id ('' si no se encuentra o no hay producto elegido).
  nombreProducto(idProducto: number | null): string {
    return this.productos().find((p) => p.id === idProducto)?.nombre ?? '';
  }

  // --- Proveedor ---

  abrirNuevoProveedor() {
    this.proveedorEditando.set(null);
    this.formProveedor = { nombre: '', contacto: null };
    this.formErrorProveedor.set(null);
    this.modalProveedorAbierto.set(true);
  }

  abrirEditarProveedor(proveedor: Proveedor) {
    this.proveedorEditando.set(proveedor);
    // Se copian los campos para que cancelar no deje cambios a medias en la lista.
    this.formProveedor = { nombre: proveedor.nombre, contacto: proveedor.contacto };
    this.formErrorProveedor.set(null);
    this.modalProveedorAbierto.set(true);
  }

  cerrarModalProveedor() {
    this.modalProveedorAbierto.set(false);
  }

  // Crea o actualiza el proveedor según haya uno en edición.
  async guardarProveedor() {
    this.guardandoProveedor.set(true);
    this.formErrorProveedor.set(null);

    // `contacto` es opcional: si queda vacío se guarda null en vez de ''.
    const datos: ProveedorInput = {
      ...this.formProveedor,
      contacto: this.formProveedor.contacto?.trim() || null,
    };

    const editando = this.proveedorEditando();
    const { error } = editando
      ? await this.proveedorService.actualizar(editando.id, datos)
      : await this.proveedorService.crear(datos);

    this.guardandoProveedor.set(false);

    if (error) {
      this.formErrorProveedor.set(error);
      return;
    }

    this.modalProveedorAbierto.set(false);
    await this.cargarDatos();
  }

  async eliminarProveedor(proveedor: Proveedor) {
    // confirm() es el cuadro nativo del navegador "Aceptar / Cancelar".
    if (!confirm(`¿Eliminar al proveedor "${proveedor.nombre}"?`)) {
      return;
    }
    const { error } = await this.proveedorService.eliminar(proveedor.id);
    if (error) {
      alert(error);
      return;
    }
    await this.cargarDatos();
  }

  // --- Compra ---

  abrirNuevaCompra() {
    // No se puede comprar sin un proveedor al que asignar la compra.
    if (this.proveedores().length === 0) {
      alert('Primero registra al menos un proveedor.');
      return;
    }
    this.compraEditando.set(null);
    this.estadoOriginalCompra = 'pendiente';
    // Se parte de la compra vacía y se preselecciona el primer proveedor de la lista.
    this.formCompra = { ...this.compraVacia(), id_proveedor: this.proveedores()[0].id };
    this.lineas.set([lineaVacia()]);
    this.formErrorCompra.set(null);
    this.modalCompraAbierto.set(true);
  }

  // Es `async` porque las líneas de la compra hay que pedirlas al backend antes de abrir el modal.
  async abrirEditarCompra(compra: Compra) {
    this.compraEditando.set(compra);
    this.estadoOriginalCompra = compra.estado;
    this.formCompra = {
      fecha: compra.fecha,
      id_proveedor: compra.id_proveedor,
      total: compra.total,
      estado: compra.estado,
    };
    this.formErrorCompra.set(null);

    const { data, error } = await this.compraService.listarDetalles(compra.id);
    if (error) {
      this.formErrorCompra.set(error);
      this.lineas.set([lineaVacia()]);
    } else {
      // Se convierten los detalles del servidor a líneas editables del formulario.
      // Si la compra no tenía líneas, se deja una en blanco para poder empezar a llenar.
      this.lineas.set(
        data.length > 0
          ? data.map((d) => ({
              id_producto: d.id_producto,
              cantidad: d.cantidad,
              precio_unitario: d.precio_unitario,
            }))
          : [lineaVacia()],
      );
    }

    this.modalCompraAbierto.set(true);
  }

  cerrarModalCompra() {
    this.modalCompraAbierto.set(false);
  }

  // `update` cambia un signal a partir de su valor anterior. Aquí se crea un arreglo NUEVO
  // (con `...ls`) en vez de modificar el existente: Angular detecta el cambio por la nueva referencia.
  agregarLinea() {
    this.lineas.update((ls) => [...ls, lineaVacia()]);
  }

  // Quita la línea de esa posición (`_` es el elemento, que no se usa; `i` es su índice).
  quitarLinea(index: number) {
    this.lineas.update((ls) => ls.filter((_, i) => i !== index));
  }

  // Al elegir un producto en una línea, se rellena su precio con el del catálogo,
  // pero solo si el usuario todavía no había escrito uno (precio en 0).
  autocompletarPrecio(index: number) {
    const linea = this.lineas()[index];
    const producto = this.productos().find((p) => p.id === linea.id_producto);
    if (producto && linea.precio_unitario === 0) {
      this.lineas.update((ls) =>
        ls.map((l, i) => (i === index ? { ...l, precio_unitario: producto.precio } : l)),
      );
    }
  }

  // Crea o actualiza la compra con sus líneas.
  async guardarCompra() {
    // Se descartan las líneas incompletas (sin producto o con cantidad 0).
    const lineasValidas = this.lineas().filter((l) => l.id_producto !== null && l.cantidad > 0);
    if (lineasValidas.length === 0) {
      this.formErrorCompra.set('Agrega al menos una línea con producto y cantidad válidos.');
      return;
    }

    this.guardandoCompra.set(true);
    this.formErrorCompra.set(null);

    // El total se calcula con las líneas del formulario (no se escribe a mano).
    const datos: CompraInput = { ...this.formCompra, total: this.totalCompra() };
    const editando = this.compraEditando();
    const { error } = editando
      ? await this.compraService.actualizar(editando.id, datos, lineasValidas, this.estadoOriginalCompra)
      : await this.compraService.crear(datos, lineasValidas);

    this.guardandoCompra.set(false);

    if (error) {
      this.formErrorCompra.set(error);
      return;
    }

    this.modalCompraAbierto.set(false);
    await this.cargarDatos();
  }

  async eliminarCompra(compra: Compra) {
    if (!confirm(`¿Eliminar la compra #${compra.id}? Esto no revierte el stock si ya fue recibida.`)) {
      return;
    }
    const { error } = await this.compraService.eliminar(compra.id);
    if (error) {
      alert(error);
      return;
    }
    await this.cargarDatos();
  }
}
