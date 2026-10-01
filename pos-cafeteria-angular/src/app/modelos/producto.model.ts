import { Categoria } from './categoria.model';

export interface Producto {
  id: number;
  nombre: string;
  id_categoria: number;
  cantidad: number;
  precio: number;
  codigo_barras: string | null;
  tags: string | null;
  // Supabase la embebe cuando se pide con select('*, categoria(*)')
  categoria: Categoria | null;
}

export type ProductoInput = Omit<Producto, 'id' | 'categoria'>;
