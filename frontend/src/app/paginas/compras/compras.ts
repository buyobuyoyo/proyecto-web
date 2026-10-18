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

function lineaVacia(): LineaCompraForm {
  return { id_producto: null, cantidad: 1, precio_unitario: 0 };
}

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

  proveedores = signal<Proveedor[]>([]);
  compras = signal<Compra[]>([]);
  productos = signal<Producto[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  // --- Proveedor ---
  modalProveedorAbierto = signal(false);
  proveedorEditando = signal<Proveedor | null>(null);
  formProveedor: ProveedorInput = { nombre: '', contacto: null };
  formErrorProveedor = signal<string | null>(null);
  guardandoProveedor = signal(false);

  // --- Compra ---
  modalCompraAbierto = signal(false);
  compraEditando = signal<Compra | null>(null);
  estadoOriginalCompra: EstadoCompra = 'pendiente';
  formCompra: CompraInput = this.compraVacia();
  lineas = signal<LineaCompraForm[]>([lineaVacia()]);
  formErrorCompra = signal<string | null>(null);
  guardandoCompra = signal(false);

  totalCompra = computed(() =>
    this.lineas().reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0),
  );

  constructor() {
    this.cargarDatos();
  }

  private compraVacia(): CompraInput {
    return {
      fecha: new Date().toISOString().slice(0, 10),
      id_proveedor: 0,
      total: 0,
      estado: 'pendiente',
    };
  }

  async cargarDatos() {
    this.cargando.set(true);
    this.error.set(null);

    const [proveedoresRes, comprasRes, productosRes] = await Promise.all([
      this.proveedorService.listar(),
      this.compraService.listar(),
      this.productoService.listar(),
    ]);

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
    this.formProveedor = { nombre: proveedor.nombre, contacto: proveedor.contacto };
    this.formErrorProveedor.set(null);
    this.modalProveedorAbierto.set(true);
  }

  cerrarModalProveedor() {
    this.modalProveedorAbierto.set(false);
  }

  async guardarProveedor() {
    this.guardandoProveedor.set(true);
    this.formErrorProveedor.set(null);

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
    if (this.proveedores().length === 0) {
      alert('Primero registra al menos un proveedor.');
      return;
    }
    this.compraEditando.set(null);
    this.estadoOriginalCompra = 'pendiente';
    this.formCompra = { ...this.compraVacia(), id_proveedor: this.proveedores()[0].id };
    this.lineas.set([lineaVacia()]);
    this.formErrorCompra.set(null);
    this.modalCompraAbierto.set(true);
  }

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

  async guardarCompra() {
    const lineasValidas = this.lineas().filter((l) => l.id_producto !== null && l.cantidad > 0);
    if (lineasValidas.length === 0) {
      this.formErrorCompra.set('Agrega al menos una línea con producto y cantidad válidos.');
      return;
    }

    this.guardandoCompra.set(true);
    this.formErrorCompra.set(null);

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
