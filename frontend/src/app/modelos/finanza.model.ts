// Los tres tipos de movimiento financiero que existen (igual que el CHECK de la tabla `finanza`).
export type TipoFinanza = 'ingreso_venta' | 'gasto_insumo' | 'gasto_personal';

// Un movimiento de dinero (ingreso o gasto) del libro de finanzas.
export interface Finanza {
  id: number;
  fecha: string; // 'YYYY-MM-DD'
  tipo: TipoFinanza;
  monto: number;
  // Texto libre; las ventas y compras automáticas escriben 'Venta #12' o 'Compra #3'.
  origen: string | null;
}

// Lo que se envía al crear/editar: sin `id`.
export type FinanzaInput = Omit<Finanza, 'id'>;
