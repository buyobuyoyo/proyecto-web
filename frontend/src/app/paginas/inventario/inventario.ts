import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductoCard } from '../../componentes/producto-card/producto-card';
import { Modal } from '../../componentes/modal/modal';
import { CategoriaService } from '../../servicios/categoria.service';
import { ProductoService } from '../../servicios/producto.service';
import { Categoria } from '../../modelos/categoria.model';
import { Producto, ProductoInput } from '../../modelos/producto.model';

// Valores iniciales de un producto nuevo (formulario en blanco).
// Si ya hay categorías, se preselecciona una para que el select no quede vacío.
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

// Página de Inventario: lista los productos por categoría y permite crear, editar y eliminar
// tanto productos como categorías. Es un CRUD completo.
// `FormsModule` habilita [(ngModel)] (enlace bidireccional de los campos del formulario).
@Component({
  selector: 'app-inventario',
  imports: [ProductoCard, Modal, FormsModule],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css',
})
export class Inventario {
  private categoriaService = inject(CategoriaService);
  private productoService = inject(ProductoService);

  // --- Datos que vienen del backend ---
  categorias = signal<Categoria[]>([]);
  productos = signal<Producto[]>([]);
  // id de la categoría activa en el filtro; null = mostrar todas.
  categoriaSeleccionada = signal<number | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  // --- Estado de los formularios modales ---
  modalProductoAbierto = signal(false);
  modalCategoriaAbierto = signal(false);
  // Si hay un producto/categoría aquí, el formulario está EDITANDO; si es null, está CREANDO.
  productoEditando = signal<Producto | null>(null);
  categoriaEditando = signal<Categoria | null>(null);
  formError = signal<string | null>(null);
  guardando = signal(false);

  // Los campos del formulario se enlazan con [(ngModel)] a estas variables normales
  // (no signals), porque ngModel escribe directamente sobre ellas.
  formProducto: ProductoInput = productoVacio(null);
  formCategoriaNombre = '';

  // Lista de productos ya filtrada por la categoría elegida. Al ser `computed`, se recalcula
  // sola cuando cambian `productos` o `categoriaSeleccionada`.
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

  // Pide categorías y productos al backend. Se llama al abrir la página y después de cada
  // cambio (crear/editar/eliminar) para refrescar la pantalla con lo que quedó en la base.
  async cargarDatos() {
    this.cargando.set(true);
    this.error.set(null);

    // Promise.all lanza las dos peticiones a la vez y espera a que terminen ambas
    // (más rápido que pedir una y luego la otra).
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

  // Al pulsar una categoría se activa el filtro; pulsarla otra vez lo quita (alterna).
  seleccionarCategoria(id: number) {
    this.categoriaSeleccionada.set(this.categoriaSeleccionada() === id ? null : id);
  }

  // --- Producto ---

  // Abre el modal con el formulario vacío para crear un producto.
  abrirNuevoProducto() {
    this.productoEditando.set(null);
    this.formProducto = productoVacio(this.categorias()[0]?.id ?? null);
    this.formError.set(null);
    this.modalProductoAbierto.set(true);
  }

  // Abre el modal con los datos del producto cargados para editarlo.
  abrirEditarProducto(producto: Producto) {
    this.productoEditando.set(producto);
    // Se COPIAN los campos (no se usa el mismo objeto) para que, si el usuario cancela,
    // la lista de fondo no se quede con cambios a medias.
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

  // Se ejecuta al enviar el formulario: crea o actualiza según haya un producto en edición.
  async guardarProducto() {
    this.guardando.set(true);
    this.formError.set(null);

    // Normaliza cadenas vacías a null para las columnas opcionales.
    // `?.trim() || null`: quita espacios y, si queda vacío, guarda null en vez de ''
    // (importante para codigo_barras, que es UNIQUE: dos '' chocarían entre sí).
    const datos: ProductoInput = {
      ...this.formProducto,
      codigo_barras: this.formProducto.codigo_barras?.trim() || null,
      tags: this.formProducto.tags?.trim() || null,
    };

    const editando = this.productoEditando();
    // Operador ternario: si hay producto en edición, actualiza; si no, crea.
    const { error } = editando
      ? await this.productoService.actualizar(editando.id, datos)
      : await this.productoService.crear(datos);

    this.guardando.set(false);

    // Si el backend rechazó el guardado, el modal se queda abierto mostrando el motivo.
    if (error) {
      this.formError.set(error);
      return;
    }

    this.modalProductoAbierto.set(false);
    await this.cargarDatos();
  }

  async eliminarProducto(producto: Producto) {
    // confirm() es el cuadro nativo del navegador "Aceptar / Cancelar".
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

  // `evento.stopPropagation()` evita que el clic en ✎ "suba" al botón de la categoría
  // (que está en el mismo contenedor) y además active el filtro.
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
    // Si justo se eliminó la categoría que estaba filtrando, se quita el filtro.
    if (this.categoriaSeleccionada() === categoria.id) {
      this.categoriaSeleccionada.set(null);
    }
    await this.cargarDatos();
  }
}
