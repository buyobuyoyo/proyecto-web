// Resumen que devuelve GET /api/dashboard (solo administrador).
export interface Dashboard {
  hoy: { ventas: number; total: number };
  mes: { ingresos: number; gastosInsumos: number; gastosPersonal: number; balance: number };
  // Un registro por día con ventas confirmadas; `fecha` es 'YYYY-MM-DD'.
  ultimosDias: { fecha: string; ventas: number; total: number }[];
  masVendidos: { id: number; nombre: string; unidades: number }[];
  stockBajo: { id: number; nombre: string; cantidad: number }[];
  umbralStockBajo: number;
  conteos: { productos: number; empleadosActivos: number; usuarios: number; comprasPendientes: number };
}
