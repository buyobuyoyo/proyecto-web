import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Modal } from '../../componentes/modal/modal';
import { VentaService } from '../../servicios/venta.service';
import { EmpleadoService } from '../../servicios/empleado.service';
import { ProductoService } from '../../servicios/producto.service';
import { Empleado } from '../../modelos/empleado.model';
import { Venta, VentaInput, EstadoVenta } from '../../modelos/venta.model';
import { LineaVentaForm } from '../../modelos/detalle-venta.model';
import { Producto } from '../../modelos/producto.model';

// Una línea en blanco del formulario de venta (aún sin producto elegido).
function lineaVacia(): LineaVentaForm {
  return { id_producto: null, cantidad: 1, precio_unitario: 0 };
}

// Historial de ventas: tabla con TODAS las ventas registradas y un formulario completo para
// corregirlas (cambiar cajero, método de pago, estado, líneas, descuento) o eliminarlas.
// Es la vista pensada para el administrador; el cajero cobra desde la pantalla Ventas.
// `SlicePipe` se usa en la plantilla para recortar la fecha; `RouterLink` para el enlace de regreso.
@Component({
  selector: 'app-historial-ventas',
  imports: [Modal, FormsModule, SlicePipe, RouterLink],
  templateUrl: './historial-ventas.html',
  styleUrl: './historial-ventas.css',
})
export class HistorialVentas {
  private ventaService = inject(VentaService);
  private empleadoService = inject(EmpleadoService);
  private productoService = inject(ProductoService);

  // --- Datos que vienen del backend ---
  ventas = signal<Venta[]>([]);
  empleados = signal<Empleado[]>([]);
  productos = signal<Producto[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  // --- Estado del formulario modal ---
  modalVentaAbierto = signal(false);
  // Si hay una venta aquí, el formulario está EDITANDO; si es null, está CREANDO.
  ventaEditando = signal<Venta | null>(null);
  // Estado que tenía la venta al abrirla (el servicio lo pide, aunque el backend lo vuelve a leer).
  estadoOriginalVenta: EstadoVenta = 'confirmada';
  formVenta: VentaInput = this.ventaVacia();
  // Las líneas del formulario viven en un signal (arreglo) porque se agregan y quitan filas.
  lineas = signal<LineaVentaForm[]>([lineaVacia()]);
  formError = signal<string | null>(null);
  guardando = signal(false);

  // Subtotal = suma de (cantidad × precio unitario) de cada línea.
  // Al ser `computed`, se recalcula solo cada vez que cambian las líneas.
  subtotalVenta = computed(() =>
    this.lineas().reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0),
  );
  // Total = subtotal − descuento, sin bajar nunca de 0.
  totalVenta = computed(() => Math.max(0, this.subtotalVenta() - (this.formVenta.descuento || 0)));

  constructor() {
    this.cargarDatos();
  }

  // Valores iniciales de una venta nueva: ahora mismo, sin descuento, pago en efectivo, confirmada.
  private ventaVacia(): VentaInput {
    return {
      fecha: new Date().toISOString(),
      id_empleado: 0,
      subtotal: 0,
      descuento: 0,
      total: 0,
      metodo_pago: 'efectivo',
      estado: 'confirmada',
    };
  }

  // Pide ventas, empleados y productos al backend. Se llama al abrir la página y después de
  // cada cambio para refrescar la pantalla con lo que quedó en la base.
  async cargarDatos() {
    this.cargando.set(true);
    this.error.set(null);

    // Promise.all lanza las tres peticiones a la vez y espera a que terminen todas.
    const [ventasRes, empleadosRes, productosRes] = await Promise.all([
      this.ventaService.listar(),
      this.empleadoService.listar(),
      this.productoService.listar(),
    ]);

    // Se toma el primer error que exista (`??` pasa al siguiente si el anterior es null).
    const error = ventasRes.error ?? empleadosRes.error ?? productosRes.error;
    if (error) {
      this.error.set(error);
      this.cargando.set(false);
      return;
    }

    this.ventas.set(ventasRes.data);
    this.empleados.set(empleadosRes.data);
    this.productos.set(productosRes.data);
    this.cargando.set(false);
  }

  abrirNuevaVenta() {
    // Toda venta necesita un cajero, así que hace falta al menos un empleado registrado.
    if (this.empleados().length === 0) {
      alert('Primero registra al menos un empleado en RH.');
      return;
    }
    this.ventaEditando.set(null);
    this.estadoOriginalVenta = 'confirmada';
    // Se parte de la venta vacía y se preselecciona el primer empleado de la lista.
    this.formVenta = { ...this.ventaVacia(), id_empleado: this.empleados()[0].id };
    this.lineas.set([lineaVacia()]);
    this.formError.set(null);
    this.modalVentaAbierto.set(true);
  }

  // Es `async` porque las líneas de la venta hay que pedirlas al backend antes de abrir el modal.
  async abrirEditarVenta(venta: Venta) {
    this.ventaEditando.set(venta);
    this.estadoOriginalVenta = venta.estado;
    // Se copian los campos (no se comparte el objeto) para que cancelar no deje cambios a medias.
    this.formVenta = {
      fecha: venta.fecha,
      id_empleado: venta.id_empleado,
      subtotal: venta.subtotal,
      descuento: venta.descuento,
      total: venta.total,
      metodo_pago: venta.metodo_pago,
      estado: venta.estado,
    };
    this.formError.set(null);

    const { data, error } = await this.ventaService.listarDetalles(venta.id);
    if (error) {
      this.formError.set(error);
      this.lineas.set([lineaVacia()]);
    } else {
      // Se convierten los detalles del servidor a líneas editables del formulario.
      // Si la venta no tenía líneas, se deja una en blanco para poder empezar a llenar.
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

    this.modalVentaAbierto.set(true);
  }

  cerrarModal() {
    this.modalVentaAbierto.set(false);
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

  // Crea o actualiza la venta con sus líneas.
  async guardarVenta() {
    // Se descartan las líneas incompletas (sin producto o con cantidad 0).
    const lineasValidas = this.lineas().filter((l) => l.id_producto !== null && l.cantidad > 0);
    if (lineasValidas.length === 0) {
      this.formError.set('Agrega al menos una línea con producto y cantidad válidos.');
      return;
    }

    this.guardando.set(true);
    this.formError.set(null);

    // Subtotal y total se calculan con las líneas del formulario (no se escriben a mano).
    const datos: VentaInput = {
      ...this.formVenta,
      subtotal: this.subtotalVenta(),
      total: this.totalVenta(),
    };

    const editando = this.ventaEditando();
    const { error } = editando
      ? await this.ventaService.actualizar(editando.id, datos, lineasValidas, this.estadoOriginalVenta)
      : await this.ventaService.crear(datos, lineasValidas);

    this.guardando.set(false);

    // Si el backend rechazó el guardado (por ejemplo, stock insuficiente), el modal se queda abierto.
    if (error) {
      this.formError.set(error);
      return;
    }

    this.modalVentaAbierto.set(false);
    await this.cargarDatos();
  }

  async eliminarVenta(venta: Venta) {
    // confirm() es el cuadro nativo del navegador "Aceptar / Cancelar".
    if (!confirm(`¿Eliminar la venta #${venta.id}? Esto no revierte el stock si ya fue confirmada.`)) {
      return;
    }
    const { error } = await this.ventaService.eliminar(venta.id);
    if (error) {
      alert(error);
      return;
    }
    await this.cargarDatos();
  }
}
