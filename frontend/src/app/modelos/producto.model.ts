import { Categoria } from './categoria.model';

// Un producto tal como lo devuelve el API (tabla `producto` + su categoría).
export interface Producto {
  id: number;
  nombre: string;
  id_categoria: number;
  cantidad: number; // stock actual
  precio: number;
  codigo_barras: string | null; // `null` = no tiene código
  tags: string | null;
  // El backend la incluye anidada (JOIN), equivalente a antes: select('*, categoria(*)')
  categoria: Categoria | null;
}

// Lo que se envía al crear/editar: sin `id` (lo asigna MySQL), `categoria` (la calcula el JOIN) ni
// `cantidad` (el stock solo cambia con compras, ventas y devoluciones, no se captura a mano).
export type ProductoInput = Omit<Producto, 'id' | 'categoria' | 'cantidad'>;
