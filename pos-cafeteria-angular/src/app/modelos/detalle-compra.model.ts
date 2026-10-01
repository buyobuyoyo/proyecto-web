import { Producto } from './producto.model';

export interface DetalleCompra {
  id: number;
  id_compra: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  // Supabase la embebe cuando se pide con select('*, producto(*)')
  producto: Producto | null;
}

export type DetalleCompraInput = Omit<DetalleCompra, 'id' | 'producto'>;

/** Fila editable del formulario de compra, antes de guardarse. */
export interface LineaCompraForm {
  id_producto: number | null;
  cantidad: number;
  precio_unitario: number;
}
