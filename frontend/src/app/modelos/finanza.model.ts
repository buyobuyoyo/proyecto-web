export type TipoFinanza = 'ingreso_venta' | 'gasto_insumo' | 'gasto_personal';

export interface Finanza {
  id: number;
  fecha: string; // 'YYYY-MM-DD'
  tipo: TipoFinanza;
  monto: number;
  origen: string | null;
}

export type FinanzaInput = Omit<Finanza, 'id'>;
