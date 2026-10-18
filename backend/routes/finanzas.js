// /api/finanzas -> CRUD de la tabla `finanza` (ingresos y gastos).
// Aquí caen tanto los movimientos manuales como los que generan solos las ventas y compras
// (ver registrarIngreso en ventas.js y registrarGasto en compras.js).
const { pool } = require('../config/db');
const { crearCrud } = require('../utils/crud');

module.exports = crearCrud({
  tabla: 'finanza', // tabla sobre la que opera
  // `tipo` puede ser ingreso_venta, gasto_insumo o gasto_personal (la base de datos valida el valor).
  columnas: ['fecha', 'tipo', 'monto', 'origen'],
  listar: async () => {
    // Lo más reciente primero; `id DESC` desempata movimientos del mismo día.
    const [filas] = await pool.query('SELECT * FROM finanza ORDER BY fecha DESC, id DESC');
    return filas;
  },
});
