import { Proveedor } from './proveedor.model';

export type EstadoCompra = 'pendiente' | 'recibida' | 'cancelada';

export interface Compra {
  id: number;
  fecha: string; // 'YYYY-MM-DD'
  id_proveedor: number;
  total: number;
  estado: EstadoCompra;
  // El backend la incluye anidada (JOIN), equivalente a antes: select('*, proveedor(*)')
  proveedor: Proveedor | null;
}

export type CompraInput = Omit<Compra, 'id' | 'proveedor'>;
