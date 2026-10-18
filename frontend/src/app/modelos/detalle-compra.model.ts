import { Producto } from './producto.model';

// Una línea de una compra (tabla `detalle_compra`): qué producto, cuántos y a qué precio.
export interface DetalleCompra {
  id: number;
  id_compra: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  // El backend la incluye anidada (JOIN), equivalente a antes: select('*, producto(*)')
  producto: Producto | null;
}

// Lo que se envía al guardar: sin `id` ni `producto`.
export type DetalleCompraInput = Omit<DetalleCompra, 'id' | 'producto'>;

/** Fila editable del formulario de compra, antes de guardarse. */
// `id_producto` puede ser null mientras el usuario todavía no elige un producto en el select.
export interface LineaCompraForm {
  id_producto: number | null;
  cantidad: number;
  precio_unitario: number;
}
