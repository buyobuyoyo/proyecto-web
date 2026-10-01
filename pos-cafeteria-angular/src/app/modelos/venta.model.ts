import { Empleado } from './empleado.model';

export type EstadoVenta = 'confirmada' | 'cancelada' | 'devuelta';
export type MetodoPago = 'efectivo' | 'tarjeta';

export interface Venta {
  id: number;
  fecha: string; // timestamp ISO
  id_empleado: number;
  subtotal: number;
  descuento: number;
  total: number;
  metodo_pago: MetodoPago | null;
  estado: EstadoVenta;
  // Supabase la embebe cuando se pide con select('*, empleado(*)')
  empleado: Empleado | null;
}

export type VentaInput = Omit<Venta, 'id' | 'empleado'>;
