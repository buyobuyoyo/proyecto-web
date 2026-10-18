// /api/ventas -> ventas del punto de venta.
// Igual que en compras: cada operación corre en una transacción para que la venta,
// sus líneas, el descuento de stock y el ingreso en finanzas se guarden juntos o ninguno.
const express = require('express');
const { pool, conTransaccion } = require('../config/db');
const { ErrorNegocio } = require('../utils/errores');
const { soloColumnas, anidar, isoAMysql, mysqlAIso } = require('../utils/datos');

const router = express.Router();
const COLUMNAS_VENTA = ['fecha', 'id_empleado', 'subtotal', 'descuento', 'total', 'metodo_pago', 'estado'];

// Prepara el objeto venta que manda Angular para guardarlo en MySQL (convierte la fecha).
function ventaParaGuardar(venta) {
  const datos = soloColumnas(venta, COLUMNAS_VENTA);
  if (datos.fecha) datos.fecha = isoAMysql(datos.fecha);
  return datos;
}

// Lista de ventas, cada una con su empleado (equivale a select('*, empleado(*)')).
router.get('/', async (req, res) => {
  const [filas] = await pool.query({
    sql: `SELECT venta.*, empleado.*
          FROM venta
          LEFT JOIN empleado ON empleado.id = venta.id_empleado
          ORDER BY venta.fecha DESC, venta.id DESC`,
    nestTables: true,
  });
  res.json(anidar(filas, 'venta', 'empleado').map((v) => ({ ...v, fecha: mysqlAIso(v.fecha) })));
});

// Líneas de una venta, cada una con su producto.
router.get('/:id/detalles', async (req, res) => {
  const [filas] = await pool.query(
    {
      sql: `SELECT detalle_venta.*, producto.*
            FROM detalle_venta
            LEFT JOIN producto ON producto.id = detalle_venta.id_producto
            WHERE detalle_venta.id_venta = ?`,
      nestTables: true,
    },
    [req.params.id],
  );
  res.json(anidar(filas, 'detalle_venta', 'producto'));
});

// Crear venta. Body: { venta: {...}, lineas: [{ id_producto, cantidad, precio_unitario }] }
router.post('/', async (req, res) => {
  const { venta, lineas } = req.body;
  if (!venta) throw new ErrorNegocio('Faltan los datos de la venta.');

  const id = await conTransaccion(async (conexion) => {
    const [resultado] = await conexion.query('INSERT INTO venta SET ?', [ventaParaGuardar(venta)]);
    await guardarLineas(conexion, resultado.insertId, lineas);

    // Solo una venta "confirmada" mueve inventario y finanzas.
    if (venta.estado === 'confirmada') {
      await descontarStock(conexion, lineas);
      await registrarIngreso(conexion, venta, resultado.insertId);
    }
    return resultado.insertId;
  });

  res.status(201).json({ id });
});

// Actualizar venta. Body: igual que POST.
router.put('/:id', async (req, res) => {
  const { venta, lineas } = req.body;
  const id = Number(req.params.id);
  if (!venta) throw new ErrorNegocio('Faltan los datos de la venta.');

  await conTransaccion(async (conexion) => {
    // El estado anterior se lee de la base (bloqueando la fila) para no descontar dos veces.
    const [actual] = await conexion.query('SELECT estado FROM venta WHERE id = ? FOR UPDATE', [id]);
    if (actual.length === 0) throw new ErrorNegocio('Venta no encontrada.', 404);
    const estadoAnterior = actual[0].estado;

    await conexion.query('UPDATE venta SET ? WHERE id = ?', [ventaParaGuardar(venta), id]);

    // Se reemplazan todas las líneas por las del formulario.
    await conexion.query('DELETE FROM detalle_venta WHERE id_venta = ?', [id]);
    await guardarLineas(conexion, id, lineas);

    if (venta.estado === 'confirmada' && estadoAnterior !== 'confirmada') {
      await descontarStock(conexion, lineas);
      await registrarIngreso(conexion, venta, id);
    }
  });

  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  await conTransaccion(async (conexion) => {
    await conexion.query('DELETE FROM detalle_venta WHERE id_venta = ?', [req.params.id]);
    const [resultado] = await conexion.query('DELETE FROM venta WHERE id = ?', [req.params.id]);
    if (resultado.affectedRows === 0) throw new ErrorNegocio('Venta no encontrada.', 404);
  });
  res.json({ ok: true });
});

async function guardarLineas(conexion, idVenta, lineas) {
  if (!Array.isArray(lineas) || lineas.length === 0) return;
  const filas = lineas.map((l) => [idVenta, l.id_producto, l.cantidad, l.precio_unitario]);
  await conexion.query(
    'INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario) VALUES ?',
    [filas],
  );
}

// Resta lo vendido al stock. El `AND cantidad >= ?` impide dejar el stock en negativo:
// si no alcanza, el UPDATE no modifica nada y se cancela toda la venta con un mensaje claro.
async function descontarStock(conexion, lineas) {
  for (const linea of lineas ?? []) {
    if (!linea.id_producto) continue;
    const [resultado] = await conexion.query(
      'UPDATE producto SET cantidad = cantidad - ? WHERE id = ? AND cantidad >= ?',
      [linea.cantidad, linea.id_producto, linea.cantidad],
    );
    if (resultado.affectedRows === 0) {
      throw new ErrorNegocio(`Stock insuficiente para el producto #${linea.id_producto}.`, 409);
    }
  }
}

// Registra el ingreso de la venta en `finanza` (solo la fecha, sin la hora).
async function registrarIngreso(conexion, venta, idVenta) {
  await conexion.query('INSERT INTO finanza (fecha, tipo, monto, origen) VALUES (?, ?, ?, ?)', [
    venta.fecha.slice(0, 10),
    'ingreso_venta',
    venta.total,
    `Venta #${idVenta}`,
  ]);
}

module.exports = router;
