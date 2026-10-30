// Resumen para el panel del administrador. Solo lee datos que ya existen (venta,
// detalle_venta, finanza, producto, compra, empleado, usuario); no escribe nada.
//
// Nota de fechas: las ventas se guardan en UTC (ver utils/datos.js) y finanza guarda el día
// de esa misma fecha UTC, así que "hoy" y "mes" se calculan con UTC_DATE() para coincidir con
// lo que ya muestran Finanzas e Historial.
const express = require('express');
const { pool } = require('../config/db');

const router = express.Router();

// Un producto con esta cantidad o menos se considera de stock bajo.
const STOCK_BAJO = 5;

// GET /api/dashboard -> todas las cifras del panel en una sola respuesta.
// Cada bloque de abajo es una consulta SQL independiente; al final se juntan en un solo JSON.
router.get('/', async (req, res) => {
  // Ventas de hoy: cuántas y cuánto sumaron. COALESCE cambia NULL por 0 si no hubo ventas.
  // El doble corchete [[hoy]] saca la primera (y única) fila del resultado.
  const [[hoy]] = await pool.query(
    `SELECT COUNT(*) AS ventas, COALESCE(SUM(total), 0) AS total
       FROM venta WHERE estado = 'confirmada' AND DATE(fecha) = UTC_DATE()`,
  );

  // Ingresos y gastos del mes en curso, por tipo.
  const [finanzasMes] = await pool.query(
    `SELECT tipo, COALESCE(SUM(monto), 0) AS total
       FROM finanza
      WHERE fecha >= DATE_FORMAT(UTC_DATE(), '%Y-%m-01')
      GROUP BY tipo`,
  );
  // La consulta devuelve una fila por tipo; aquí se reparten en un objeto con nombres claros.
  const mes = { ingresos: 0, gastosInsumos: 0, gastosPersonal: 0 };
  for (const fila of finanzasMes) {
    if (fila.tipo === 'ingreso_venta') mes.ingresos = fila.total;
    if (fila.tipo === 'gasto_insumo') mes.gastosInsumos = fila.total;
    if (fila.tipo === 'gasto_personal') mes.gastosPersonal = fila.total;
  }
  // Balance = lo que entró menos todo lo que salió.
  mes.balance = mes.ingresos - mes.gastosInsumos - mes.gastosPersonal;

  // Ventas confirmadas de los últimos 7 días (hoy incluido). Los días sin ventas no aparecen.
  const [ultimosDias] = await pool.query(
    `SELECT DATE(fecha) AS fecha, COUNT(*) AS ventas, SUM(total) AS total
       FROM venta
      WHERE estado = 'confirmada' AND DATE(fecha) > DATE_SUB(UTC_DATE(), INTERVAL 7 DAY)
      GROUP BY DATE(fecha)
      ORDER BY fecha`,
  );

  // Los 5 productos más vendidos en los últimos 30 días.
  const [masVendidos] = await pool.query(
    `SELECT p.id, p.nombre, SUM(d.cantidad) AS unidades
       FROM detalle_venta d
       JOIN venta v ON v.id = d.id_venta AND v.estado = 'confirmada'
       JOIN producto p ON p.id = d.id_producto
      WHERE DATE(v.fecha) > DATE_SUB(UTC_DATE(), INTERVAL 30 DAY)
      GROUP BY p.id, p.nombre
      ORDER BY unidades DESC
      LIMIT 5`,
  );

  // Productos que casi se agotan (hasta STOCK_BAJO unidades), los más escasos primero.
  const [stockBajo] = await pool.query(
    'SELECT id, nombre, cantidad FROM producto WHERE cantidad <= ? ORDER BY cantidad, nombre LIMIT 10',
    [STOCK_BAJO],
  );

  // Totales sueltos para las tarjetas del panel; cada subconsulta devuelve un solo número.
  const [[conteos]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM producto) AS productos,
       (SELECT COUNT(*) FROM empleado WHERE estado = 'activo') AS empleadosActivos,
       (SELECT COUNT(*) FROM usuario) AS usuarios,
       (SELECT COUNT(*) FROM compra WHERE estado = 'pendiente') AS comprasPendientes`,
  );

  res.json({ hoy, mes, ultimosDias, masVendidos, stockBajo, umbralStockBajo: STOCK_BAJO, conteos });
});

module.exports = router;
