import { Proveedor } from './proveedor.model';

// Los únicos valores que puede tener el estado de una compra (igual que el CHECK de la BD).
// Solo una compra 'recibida' suma stock y registra el gasto.
export type EstadoCompra = 'pendiente' | 'recibida' | 'cancelada';

// Una compra tal como la devuelve el API (tabla `compra` + su proveedor).
export interface Compra {
  id: number;
  fecha: string; // 'YYYY-MM-DD'
  id_proveedor: number;
  total: number;
  estado: EstadoCompra;
  // El backend la incluye anidada (JOIN), equivalente a antes: select('*, proveedor(*)')
  // Es `null` si la compra no tiene proveedor asociado.
  proveedor: Proveedor | null;
}

// Lo que se envía al crear/editar: sin `id` (lo asigna MySQL) ni `proveedor` (se calcula con el JOIN).
export type CompraInput = Omit<Compra, 'id' | 'proveedor'>;
