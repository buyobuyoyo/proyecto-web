// /api/compras -> compras a proveedores.
// Antes el frontend hacía todos estos pasos uno por uno (encabezado, líneas, stock, gasto)
// y si algo fallaba a la mitad quedaban datos a medias. Ahora cada operación corre
// dentro de UNA transacción: o se guarda todo, o no se guarda nada.
//
// Modelo de datos: una compra tiene un "encabezado" (tabla `compra`: fecha, proveedor, total,
// estado) y varias "líneas" (tabla `detalle_compra`: qué producto, cuántos y a qué precio).
const express = require('express');
const { pool, conTransaccion } = require('../config/db');
const { ErrorNegocio } = require('../utils/errores');
const { soloColumnas, anidar } = require('../utils/datos');

const router = express.Router();
// Columnas del encabezado que el cliente puede escribir (el id lo asigna MySQL).
const COLUMNAS_COMPRA = ['fecha', 'id_proveedor', 'total', 'estado'];

// Lista de compras, cada una con su proveedor (equivale a select('*, proveedor(*)')).
// Más recientes primero; el `id DESC` desempata compras de la misma fecha.
router.get('/', async (req, res) => {
  const [filas] = await pool.query({
    sql: `SELECT compra.*, proveedor.*
          FROM compra
          LEFT JOIN proveedor ON proveedor.id = compra.id_proveedor
          ORDER BY compra.fecha DESC, compra.id DESC`,
    nestTables: true, // separa las columnas por tabla para que `anidar` pueda reorganizarlas
  });
  res.json(anidar(filas, 'compra', 'proveedor'));
});

// Líneas de una compra, cada una con su producto.
// Se usa al abrir una compra para editarla en el formulario.
router.get('/:id/detalles', async (req, res) => {
  // Con `nestTables` la consulta se pasa como objeto y los parámetros (?) como segundo argumento.
  const [filas] = await pool.query(
    {
      sql: `SELECT detalle_compra.*, producto.*
            FROM detalle_compra
            LEFT JOIN producto ON producto.id = detalle_compra.id_producto
            WHERE detalle_compra.id_compra = ?`,
      nestTables: true,
    },
    [req.params.id],
  );
  res.json(anidar(filas, 'detalle_compra', 'producto'));
});

// Crear compra. Body: { compra: {...}, lineas: [{ id_producto, cantidad, precio_unitario }] }
router.post('/', async (req, res) => {
  const { compra, lineas } = req.body;
  if (!compra) throw new ErrorNegocio('Faltan los datos de la compra.');

  // Todo lo de dentro ocurre en una transacción: si cualquier paso lanza error,
  // se deshace el encabezado, las líneas, el stock y el gasto.
  const id = await conTransaccion(async (conexion) => {
    const [resultado] = await conexion.query('INSERT INTO compra SET ?', [soloColumnas(compra, COLUMNAS_COMPRA)]);
    // `insertId` es el id que MySQL le dio a la compra recién insertada.
    await guardarLineas(conexion, resultado.insertId, lineas);

    // Solo una compra "recibida" afecta el inventario y las finanzas.
    if (compra.estado === 'recibida') {
      await sumarStock(conexion, lineas);
      await registrarGasto(conexion, compra, resultado.insertId);
    }
    return resultado.insertId;
  });

  res.status(201).json({ id });
});

// Actualizar compra. Body: igual que POST.
router.put('/:id', async (req, res) => {
  const { compra, lineas } = req.body;
  const id = Number(req.params.id);
  if (!compra) throw new ErrorNegocio('Faltan los datos de la compra.');

  await conTransaccion(async (conexion) => {
    // Se lee el estado ANTERIOR directamente de la base (y se bloquea la fila) en vez de
    // confiar en lo que mande el navegador: así el stock nunca se suma dos veces.
    // `FOR UPDATE` bloquea la fila hasta terminar la transacción: otra petición que intente
    // editar la misma compra a la vez tendrá que esperar.
    const [actual] = await conexion.query('SELECT estado FROM compra WHERE id = ? FOR UPDATE', [id]);
    if (actual.length === 0) throw new ErrorNegocio('Compra no encontrada.', 404);
    const estadoAnterior = actual[0].estado;

    await conexion.query('UPDATE compra SET ? WHERE id = ?', [soloColumnas(compra, COLUMNAS_COMPRA), id]);

    // Se reemplazan todas las líneas por las del formulario (más simple que compararlas).
    await conexion.query('DELETE FROM detalle_compra WHERE id_compra = ?', [id]);
    await guardarLineas(conexion, id, lineas);

    // Solo se suma stock y se registra el gasto en el momento en que la compra PASA a "recibida"
    // (antes no lo era). Si ya estaba recibida y solo se edita otra cosa, no se repite.
    if (compra.estado === 'recibida' && estadoAnterior !== 'recibida') {
      await sumarStock(conexion, lineas);
      await registrarGasto(conexion, compra, id);
    }
  });

  res.json({ ok: true });
});

// Eliminar compra. Nota: no revierte el stock ni el gasto si la compra ya estaba recibida.
router.delete('/:id', async (req, res) => {
  await conTransaccion(async (conexion) => {
    // Primero las líneas (tienen llave foránea hacia la compra) y luego el encabezado.
    await conexion.query('DELETE FROM detalle_compra WHERE id_compra = ?', [req.params.id]);
    const [resultado] = await conexion.query('DELETE FROM compra WHERE id = ?', [req.params.id]);
    if (resultado.affectedRows === 0) throw new ErrorNegocio('Compra no encontrada.', 404);
  });
  res.json({ ok: true });
});

// Inserta las líneas de una compra. Recibe la `conexion` de la transacción para que
// quede dentro de ella.
async function guardarLineas(conexion, idCompra, lineas) {
  if (!Array.isArray(lineas) || lineas.length === 0) return;
  // `VALUES ?` con un arreglo de arreglos inserta todas las filas en un solo INSERT.
  const filas = lineas.map((l) => [idCompra, l.id_producto, l.cantidad, l.precio_unitario]);
  await conexion.query(
    'INSERT INTO detalle_compra (id_compra, id_producto, cantidad, precio_unitario) VALUES ?',
    [filas],
  );
}

// Suma lo comprado al stock de cada producto.
// `cantidad = cantidad + ?` lo calcula MySQL en el mismo UPDATE; antes se leía y luego se
// escribía, y dos usuarios a la vez podían pisarse.
async function sumarStock(conexion, lineas) {
  // `lineas ?? []` evita un error si no llegaron líneas.
  for (const linea of lineas ?? []) {
    if (!linea.id_producto) continue; // línea sin producto elegido: se ignora
    const [resultado] = await conexion.query('UPDATE producto SET cantidad = cantidad + ? WHERE id = ?', [
      linea.cantidad,
      linea.id_producto,
    ]);
    // 0 filas afectadas = ese producto no existe; se cancela toda la transacción.
    if (resultado.affectedRows === 0) {
      throw new ErrorNegocio('No se pudo actualizar el stock: producto no encontrado.', 404);
    }
  }
}

// Registra el gasto de la compra en `finanza`.
// El campo `origen` guarda el número de compra para poder rastrear de dónde salió el gasto.
async function registrarGasto(conexion, compra, idCompra) {
  await conexion.query('INSERT INTO finanza (fecha, tipo, monto, origen) VALUES (?, ?, ?, ?)', [
    compra.fecha,
    'gasto_insumo',
    compra.total,
    `Compra #${idCompra}`,
  ]);
}

module.exports = router;
