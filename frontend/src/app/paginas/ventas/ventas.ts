import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { Modal } from '../../componentes/modal/modal';
import { VentaService } from '../../servicios/venta.service';
import { EmpleadoService } from '../../servicios/empleado.service';
import { ProductoService } from '../../servicios/producto.service';
import { Empleado } from '../../modelos/empleado.model';
import { Venta, VentaInput, EstadoVenta } from '../../modelos/venta.model';
import { LineaVentaForm } from '../../modelos/detalle-venta.model';
import { Producto } from '../../modelos/producto.model';

function lineaVacia(): LineaVentaForm {
  return { id_producto: null, cantidad: 1, precio_unitario: 0 };
}

@Component({
  selector: 'app-ventas',
  imports: [Modal, FormsModule, SlicePipe],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css',
})
export class Ventas {
  private ventaService = inject(VentaService);
  private empleadoService = inject(EmpleadoService);
  private productoService = inject(ProductoService);

  ventas = signal<Venta[]>([]);
  empleados = signal<Empleado[]>([]);
  productos = signal<Producto[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  modalVentaAbierto = signal(false);
  ventaEditando = signal<Venta | null>(null);
  estadoOriginalVenta: EstadoVenta = 'confirmada';
  formVenta: VentaInput = this.ventaVacia();
  lineas = signal<LineaVentaForm[]>([lineaVacia()]);
  formError = signal<string | null>(null);
  guardando = signal(false);

  subtotalVenta = computed(() =>
    this.lineas().reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0),
  );
  totalVenta = computed(() => Math.max(0, this.subtotalVenta() - (this.formVenta.descuento || 0)));

  constructor() {
    this.cargarDatos();
  }

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

  async cargarDatos() {
    this.cargando.set(true);
    this.error.set(null);

    const [ventasRes, empleadosRes, productosRes] = await Promise.all([
      this.ventaService.listar(),
      this.empleadoService.listar(),
      this.productoService.listar(),
    ]);

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
    if (this.empleados().length === 0) {
      alert('Primero registra al menos un empleado en RH.');
      return;
    }
    this.ventaEditando.set(null);
    this.estadoOriginalVenta = 'confirmada';
    this.formVenta = { ...this.ventaVacia(), id_empleado: this.empleados()[0].id };
    this.lineas.set([lineaVacia()]);
    this.formError.set(null);
    this.modalVentaAbierto.set(true);
  }

  async abrirEditarVenta(venta: Venta) {
    this.ventaEditando.set(venta);
    this.estadoOriginalVenta = venta.estado;
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

  agregarLinea() {
    this.lineas.update((ls) => [...ls, lineaVacia()]);
  }

  quitarLinea(index: number) {
    this.lineas.update((ls) => ls.filter((_, i) => i !== index));
  }

  autocompletarPrecio(index: number) {
    const linea = this.lineas()[index];
    const producto = this.productos().find((p) => p.id === linea.id_producto);
    if (producto && linea.precio_unitario === 0) {
      this.lineas.update((ls) =>
        ls.map((l, i) => (i === index ? { ...l, precio_unitario: producto.precio } : l)),
      );
    }
  }

  async guardarVenta() {
    const lineasValidas = this.lineas().filter((l) => l.id_producto !== null && l.cantidad > 0);
    if (lineasValidas.length === 0) {
      this.formError.set('Agrega al menos una línea con producto y cantidad válidos.');
      return;
    }

    this.guardando.set(true);
    this.formError.set(null);

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

    if (error) {
      this.formError.set(error);
      return;
    }

    this.modalVentaAbierto.set(false);
    await this.cargarDatos();
  }

  async eliminarVenta(venta: Venta) {
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
