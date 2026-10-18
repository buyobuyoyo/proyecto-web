// /api/finanzas -> CRUD de la tabla `finanza` (ingresos y gastos).
const { pool } = require('../config/db');
const { crearCrud } = require('../utils/crud');

module.exports = crearCrud({
  tabla: 'finanza',
  columnas: ['fecha', 'tipo', 'monto', 'origen'],
  listar: async () => {
    // Lo más reciente primero; `id DESC` desempata movimientos del mismo día.
    const [filas] = await pool.query('SELECT * FROM finanza ORDER BY fecha DESC, id DESC');
    return filas;
  },
});
