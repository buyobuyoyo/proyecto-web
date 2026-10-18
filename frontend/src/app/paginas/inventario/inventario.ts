import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductoCard } from '../../componentes/producto-card/producto-card';
import { Modal } from '../../componentes/modal/modal';
import { CategoriaService } from '../../servicios/categoria.service';
import { ProductoService } from '../../servicios/producto.service';
import { Categoria } from '../../modelos/categoria.model';
import { Producto, ProductoInput } from '../../modelos/producto.model';

function productoVacio(idCategoria: number | null): ProductoInput {
  return {
    nombre: '',
    id_categoria: idCategoria ?? 0,
    cantidad: 0,
    precio: 0,
    codigo_barras: null,
    tags: null,
  };
}

@Component({
  selector: 'app-inventario',
  imports: [ProductoCard, Modal, FormsModule],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css',
})
export class Inventario {
  private categoriaService = inject(CategoriaService);
  private productoService = inject(ProductoService);

  categorias = signal<Categoria[]>([]);
  productos = signal<Producto[]>([]);
  categoriaSeleccionada = signal<number | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  modalProductoAbierto = signal(false);
  modalCategoriaAbierto = signal(false);
  productoEditando = signal<Producto | null>(null);
  categoriaEditando = signal<Categoria | null>(null);
  formError = signal<string | null>(null);
  guardando = signal(false);

  formProducto: ProductoInput = productoVacio(null);
  formCategoriaNombre = '';

  productosFiltrados = computed(() => {
    const idCategoria = this.categoriaSeleccionada();
    const productos = this.productos();
    return idCategoria === null
      ? productos
      : productos.filter((p) => p.id_categoria === idCategoria);
  });

  constructor() {
    this.cargarDatos();
  }

  async cargarDatos() {
    this.cargando.set(true);
    this.error.set(null);

    const [categoriasRes, productosRes] = await Promise.all([
      this.categoriaService.listar(),
      this.productoService.listar(),
    ]);

    if (categoriasRes.error || productosRes.error) {
      this.error.set(categoriasRes.error ?? productosRes.error);
      this.cargando.set(false);
      return;
    }

    this.categorias.set(categoriasRes.data);
    this.productos.set(productosRes.data);
    this.cargando.set(false);
  }

  seleccionarCategoria(id: number) {
    this.categoriaSeleccionada.set(this.categoriaSeleccionada() === id ? null : id);
  }

  // --- Producto ---

  abrirNuevoProducto() {
    this.productoEditando.set(null);
    this.formProducto = productoVacio(this.categorias()[0]?.id ?? null);
    this.formError.set(null);
    this.modalProductoAbierto.set(true);
  }

  abrirEditarProducto(producto: Producto) {
    this.productoEditando.set(producto);
    this.formProducto = {
      nombre: producto.nombre,
      id_categoria: producto.id_categoria,
      cantidad: producto.cantidad,
      precio: producto.precio,
      codigo_barras: producto.codigo_barras,
      tags: producto.tags,
    };
    this.formError.set(null);
    this.modalProductoAbierto.set(true);
  }

  cerrarModalProducto() {
    this.modalProductoAbierto.set(false);
  }

  async guardarProducto() {
    this.guardando.set(true);
    this.formError.set(null);

    // Normaliza cadenas vacías a null para las columnas opcionales.
    const datos: ProductoInput = {
      ...this.formProducto,
      codigo_barras: this.formProducto.codigo_barras?.trim() || null,
      tags: this.formProducto.tags?.trim() || null,
    };

    const editando = this.productoEditando();
    const { error } = editando
      ? await this.productoService.actualizar(editando.id, datos)
      : await this.productoService.crear(datos);

    this.guardando.set(false);

    if (error) {
      this.formError.set(error);
      return;
    }

    this.modalProductoAbierto.set(false);
    await this.cargarDatos();
  }

  async eliminarProducto(producto: Producto) {
    if (!confirm(`¿Eliminar el producto "${producto.nombre}"?`)) {
      return;
    }
    const { error } = await this.productoService.eliminar(producto.id);
    if (error) {
      alert(error);
      return;
    }
    await this.cargarDatos();
  }

  // --- Categoría ---

  abrirNuevaCategoria() {
    this.categoriaEditando.set(null);
    this.formCategoriaNombre = '';
    this.formError.set(null);
    this.modalCategoriaAbierto.set(true);
  }

  abrirEditarCategoria(categoria: Categoria, evento: Event) {
    evento.stopPropagation();
    this.categoriaEditando.set(categoria);
    this.formCategoriaNombre = categoria.nombre;
    this.formError.set(null);
    this.modalCategoriaAbierto.set(true);
  }

  cerrarModalCategoria() {
    this.modalCategoriaAbierto.set(false);
  }

  async guardarCategoria() {
    this.guardando.set(true);
    this.formError.set(null);

    const datos = { nombre: this.formCategoriaNombre.trim() };
    const editando = this.categoriaEditando();
    const { error } = editando
      ? await this.categoriaService.actualizar(editando.id, datos)
      : await this.categoriaService.crear(datos);

    this.guardando.set(false);

    if (error) {
      this.formError.set(error);
      return;
    }

    this.modalCategoriaAbierto.set(false);
    await this.cargarDatos();
  }

  async eliminarCategoria(categoria: Categoria, evento: Event) {
    evento.stopPropagation();
    if (!confirm(`¿Eliminar la categoría "${categoria.nombre}"?`)) {
      return;
    }
    const { error } = await this.categoriaService.eliminar(categoria.id);
    if (error) {
      alert(error);
      return;
    }
    if (this.categoriaSeleccionada() === categoria.id) {
      this.categoriaSeleccionada.set(null);
    }
    await this.cargarDatos();
  }
}
