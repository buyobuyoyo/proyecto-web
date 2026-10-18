import { Producto } from './producto.model';

// Una línea de una venta (tabla `detalle_venta`): qué producto, cuántos y a qué precio se cobró.
export interface DetalleVenta {
  id: number;
  id_venta: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  // El backend la incluye anidada (JOIN), equivalente a antes: select('*, producto(*)')
  producto: Producto | null;
}

// Lo que se envía al guardar: sin `id` ni `producto`.
export type DetalleVentaInput = Omit<DetalleVenta, 'id' | 'producto'>;

/** Fila editable del formulario de venta, antes de guardarse. */
// `id_producto` puede ser null mientras el usuario todavía no elige un producto en el select.
export interface LineaVentaForm {
  id_producto: number | null;
  cantidad: number;
  precio_unitario: number;
}
