import { Producto } from './producto.model';

export interface DetalleVenta {
  id: number;
  id_venta: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  // Supabase la embebe cuando se pide con select('*, producto(*)')
  producto: Producto | null;
}

export type DetalleVentaInput = Omit<DetalleVenta, 'id' | 'producto'>;

/** Fila editable del formulario de venta, antes de guardarse. */
export interface LineaVentaForm {
  id_producto: number | null;
  cantidad: number;
  precio_unitario: number;
}
