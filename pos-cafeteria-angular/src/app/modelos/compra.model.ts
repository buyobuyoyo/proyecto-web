import { Proveedor } from './proveedor.model';

export type EstadoCompra = 'pendiente' | 'recibida' | 'cancelada';

export interface Compra {
  id: number;
  fecha: string; // 'YYYY-MM-DD'
  id_proveedor: number;
  total: number;
  estado: EstadoCompra;
  // Supabase la embebe cuando se pide con select('*, proveedor(*)')
  proveedor: Proveedor | null;
}

export type CompraInput = Omit<Compra, 'id' | 'proveedor'>;
