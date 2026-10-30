// /api/finanzas -> CRUD de la tabla `finanza` (ingresos y gastos).
// Aquí caen tanto los movimientos manuales como los que generan solos las ventas y compras
// (ver registrarIngreso en ventas.js y registrarGasto en compras.js).
const { pool } = require('../config/db');
const { crearCrud } = require('../utils/crud');
const { ErrorNegocio } = require('../utils/errores');
const { generarContabilidad } = require('../utils/contabilidad');
const { esFechaValida } = require('../utils/datos');

const router = crearCrud({
  tabla: 'finanza', // tabla sobre la que opera
  // `tipo` puede ser ingreso_venta, gasto_insumo o gasto_personal (la base de datos valida el valor).
  columnas: ['fecha', 'tipo', 'monto', 'origen'],
  listar: async () => {
    // Lo más reciente primero; `id DESC` desempata movimientos del mismo día.
    const [filas] = await pool.query('SELECT * FROM finanza ORDER BY fecha DESC, id DESC');
    return filas;
  },
});

// GET /api/finanzas/exportar-xml?desde=AAAA-MM-DD&hasta=AAAA-MM-DD (ambos opcionales)
// Descarga el libro de ingresos y gastos como XML. Usa solo la tabla `finanza` existente.
router.get('/exportar-xml', async (req, res) => {
  const { desde, hasta } = req.query;
  for (const f of [desde, hasta]) {
    if (f !== undefined && !esFechaValida(String(f))) throw new ErrorNegocio('Las fechas deben tener formato AAAA-MM-DD.');
  }
  const condiciones = [];
  const valores = [];
  if (desde) { condiciones.push('fecha >= ?'); valores.push(desde); }
  if (hasta) { condiciones.push('fecha <= ?'); valores.push(hasta); }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(
    `SELECT id, DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha, tipo, monto, origen
       FROM finanza ${donde} ORDER BY fecha, id`,
    valores,
  );
  res.set({
    'Content-Type': 'application/xml; charset=utf-8',
    'Content-Disposition': 'attachment; filename="contabilidad.xml"',
  });
  res.send(generarContabilidad(filas, { desde, hasta }));
});

module.exports = router;
