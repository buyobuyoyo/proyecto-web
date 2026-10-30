// /api/facturas -> comprobantes XML de las ventas.
//   - El administrador puede facturar cualquier venta confirmada y ver todas las facturas.
//   - El cliente solo puede facturar y ver las ventas que él mismo pagó con PayPal
//     (se comprueba con pago_paypal.id_usuario).
const express = require('express');
const { pool } = require('../config/db');
const { ErrorNegocio } = require('../utils/errores');
const { mysqlAIso, leerId } = require('../utils/datos');
const { generarComprobante } = require('../utils/comprobante');
const { enviarCorreo } = require('../utils/correo');
const { ADMIN } = require('../middleware/auth');

const router = express.Router();

// Validaciones con expresiones regulares (regex). `test()` devuelve true si el texto coincide.
// RFC de persona física (13) o moral (12). Incluye el genérico XAXX010101000.
const RFC = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Datos de la factura sin el XML (que es pesado y se descarga aparte).
const COLUMNAS_LISTA = `f.id, f.id_venta, f.folio, f.nombre_receptor, f.rfc_receptor, f.correo_receptor,
  f.creada, f.correo_estado, f.correo_enviado, f.correo_detalle, v.total`;

// ¿Puede este usuario ver/crear la factura de esta venta?
async function puedeUsarVenta(usuario, idVenta) {
  // El administrador puede con cualquier venta.
  if (usuario.rol === ADMIN) return true;
  // El cliente solo con las que pagó él (pago completado con su id de usuario).
  const [filas] = await pool.query(
    "SELECT 1 FROM pago_paypal WHERE id_venta = ? AND id_usuario = ? AND estado = 'completado'",
    [idVenta, usuario.id],
  );
  return filas.length > 0;
}

// Carga una factura aplicando el permiso. 404 tanto si no existe como si no es suya.
async function cargarFactura(usuario, id) {
  const [filas] = await pool.query('SELECT * FROM factura WHERE id = ?', [id]);
  const factura = filas[0];
  if (!factura || !(await puedeUsarVenta(usuario, factura.id_venta))) {
    throw new ErrorNegocio('Factura no encontrada.', 404);
  }
  return factura;
}

// Manda el correo con el XML adjunto y guarda en la factura cómo salió (enviado/fallido/omitido).
// Así, aunque el correo falle, la factura ya existe y se puede reenviar después.
async function enviarYGuardar(factura) {
  const resultado = await enviarCorreo({
    para: factura.correo_receptor,
    asunto: `Tu comprobante ${factura.folio} - Cafetería SweetSpot`,
    texto: [
      `Hola ${factura.nombre_receptor},`,
      '',
      `Gracias por tu compra. Adjuntamos el comprobante ${factura.folio} en formato XML.`,
      'Es un comprobante interno sin validez fiscal.',
    ].join('\n'),
    adjuntos: [{ nombre: `${factura.folio}.xml`, contenido: factura.xml }],
  });
  // Solo se anota la fecha de envío si realmente se envió. El formato es el de DATETIME de MySQL.
  await pool.query(
    'UPDATE factura SET correo_estado = ?, correo_detalle = ?, correo_enviado = ? WHERE id = ?',
    [resultado.estado, resultado.detalle, resultado.estado === 'enviado' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null, factura.id],
  );
  return resultado;
}

// GET /api/facturas -> lista (el cliente solo ve las suyas).
router.get('/', async (req, res) => {
  const esAdmin = req.usuario.rol === ADMIN;
  // El administrador ve todas; el cliente, solo las facturas de ventas que él pagó.
  // `${...}` mete un trozo de SQL fijo según el rol; los valores del usuario siempre van con `?`.
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS_LISTA}
       FROM factura f
       JOIN venta v ON v.id = f.id_venta
       ${esAdmin ? '' : 'WHERE f.id_venta IN (SELECT id_venta FROM pago_paypal WHERE id_usuario = ? AND id_venta IS NOT NULL)'}
      ORDER BY f.id DESC`,
    esAdmin ? [] : [req.usuario.id],
  );
  res.json(filas.map((f) => ({ ...f, creada: mysqlAIso(f.creada) })));
});

// POST /api/facturas { id_venta, nombre_receptor, rfc_receptor, correo_receptor }
router.post('/', async (req, res) => {
  // Se leen y limpian los datos del formulario (el navegador no es de fiar).
  const idVenta = Number(req.body?.id_venta);
  const nombre = String(req.body?.nombre_receptor ?? '').trim();
  const rfc = String(req.body?.rfc_receptor ?? '').trim().toUpperCase();
  const correo = String(req.body?.correo_receptor ?? '').trim();

  // Cada validación lanza un ErrorNegocio con su mensaje; server.js lo convierte en respuesta HTTP.
  if (!Number.isInteger(idVenta) || idVenta <= 0) throw new ErrorNegocio('Indica la venta a facturar.');
  if (nombre.length < 3 || nombre.length > 150) throw new ErrorNegocio('El nombre del receptor debe tener entre 3 y 150 caracteres.');
  if (!RFC.test(rfc)) throw new ErrorNegocio('El RFC no tiene un formato válido.');
  if (!CORREO.test(correo) || correo.length > 120) throw new ErrorNegocio('El correo no es válido.');

  // Un cliente que pide la factura de una venta ajena recibe el mismo 404 que si no existiera.
  if (!(await puedeUsarVenta(req.usuario, idVenta))) throw new ErrorNegocio('Venta no encontrada.', 404);

  const [ventas] = await pool.query(
    "SELECT id, fecha, subtotal, descuento, total, metodo_pago, estado FROM venta WHERE id = ?",
    [idVenta],
  );
  const venta = ventas[0];
  if (!venta) throw new ErrorNegocio('Venta no encontrada.', 404);
  if (venta.estado !== 'confirmada') throw new ErrorNegocio('Solo se pueden facturar ventas confirmadas.', 409);

  // Los conceptos del comprobante: qué productos y cuántos se vendieron en esa venta.
  const [lineas] = await pool.query(
    `SELECT p.nombre, d.cantidad, d.precio_unitario
       FROM detalle_venta d JOIN producto p ON p.id = d.id_producto
      WHERE d.id_venta = ?`,
    [idVenta],
  );

  // Folio determinista (una factura por venta, así que no puede repetirse).
  const folio = `F-${String(idVenta).padStart(6, '0')}`;
  // El XML se genera una vez y se guarda en la base: así la descarga y el reenvío no lo recalculan.
  const xml = generarComprobante(
    { ...venta, fecha: mysqlAIso(venta.fecha) },
    lineas,
    { folio, nombre, rfc },
  );

  // Las columnas id_venta y folio son UNIQUE: si ya existe factura, MySQL rechaza el INSERT
  // con ER_DUP_ENTRY y aquí se traduce a un mensaje claro.
  let idFactura;
  try {
    const [resultado] = await pool.query(
      'INSERT INTO factura (id_venta, folio, nombre_receptor, rfc_receptor, correo_receptor, xml) VALUES (?, ?, ?, ?, ?, ?)',
      [idVenta, folio, nombre, rfc, correo, xml],
    );
    idFactura = resultado.insertId;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new ErrorNegocio('Esa venta ya tiene factura.', 409);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      throw new ErrorNegocio('Falta ejecutar database/bd.sql en la base de datos.', 503);
    }
    throw error;
  }

  // El correo se envía DESPUÉS de guardar: un fallo de correo no deshace la factura.
  const correoResultado = await enviarYGuardar({ id: idFactura, folio, nombre_receptor: nombre, correo_receptor: correo, xml });
  res.status(201).json({ id: idFactura, folio, correo_estado: correoResultado.estado, correo_detalle: correoResultado.detalle });
});

// GET /api/facturas/:id/xml -> descarga el XML.
router.get('/:id/xml', async (req, res) => {
  const factura = await cargarFactura(req.usuario, leerId(req.params.id));
  // Content-Disposition: attachment hace que el navegador descargue el archivo en vez de mostrarlo.
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${factura.folio}.xml"`);
  res.send(factura.xml);
});

// POST /api/facturas/:id/reenviar -> vuelve a mandar el correo (por ejemplo, tras configurar Resend).
router.post('/:id/reenviar', async (req, res) => {
  const factura = await cargarFactura(req.usuario, leerId(req.params.id));
  const resultado = await enviarYGuardar(factura);
  res.json({ correo_estado: resultado.estado, correo_detalle: resultado.detalle });
});

module.exports = router;
