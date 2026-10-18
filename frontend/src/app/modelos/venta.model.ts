import { Empleado } from './empleado.model';

// Valores permitidos (igual que los CHECK de la tabla `venta`).
// Solo una venta 'confirmada' descuenta stock y registra el ingreso.
export type EstadoVenta = 'confirmada' | 'cancelada' | 'devuelta';
export type MetodoPago = 'efectivo' | 'tarjeta';

// Una venta tal como la devuelve el API (tabla `venta` + el empleado que cobró).
export interface Venta {
  id: number;
  fecha: string; // timestamp ISO
  id_empleado: number; // el cajero
  subtotal: number;
  descuento: number;
  total: number;
  metodo_pago: MetodoPago | null;
  estado: EstadoVenta;
  // El backend la incluye anidada (JOIN), equivalente a antes: select('*, empleado(*)')
  empleado: Empleado | null;
}

// Lo que se envía al crear/editar: sin `id` (lo asigna MySQL) ni `empleado` (la calcula el JOIN).
export type VentaInput = Omit<Venta, 'id' | 'empleado'>;
