// /api/checkout -> compra en línea con PayPal. Lo usan el administrador y el cliente.
//
// Regla de oro: el navegador NUNCA decide cuánto se cobra. Solo manda qué productos y
// cuántos; el precio, el total y el stock se calculan aquí con la base de datos, y el pago
// se valida contra la respuesta de PayPal antes de registrar la venta.
//
// Flujo:
//   1. POST /paypal/orden     -> el servidor calcula el total, crea la orden en PayPal y la guarda.
//   2. (el comprador aprueba el pago en la ventana de PayPal)
//   3. POST /paypal/capturar  -> el servidor cobra, comprueba monto y moneda, y registra
//                                venta + stock + ingreso en una sola transacción.
const express = require('express');
const { pool, conTransaccion } = require('../config/db');
const { ErrorNegocio } = require('../utils/errores');
const { isoAMysql } = require('../utils/datos');
const paypal = require('../utils/paypal');

const router = express.Router();

// Límites para que un carrito malicioso o con errores no sature al servidor.
const MAX_LINEAS = 50;
const MAX_CANTIDAD = 99;
// Las ventas en línea no las hace un cajero: se asignan a este empleado ficticio, que crea
// el script database/bd.sql (venta.id_empleado es obligatorio).
const NOMBRE_EMPLEADO_ONLINE = 'Venta en línea';

// Convierte pesos a centavos enteros para sumar sin errores de decimales.
const centavos = (pesos) => Math.round(Number(pesos) * 100);

// Valida el carrito que manda el navegador y junta productos repetidos.
function leerLineas(lineas) {
  if (!Array.isArray(lineas) || lineas.length === 0) {
    throw new ErrorNegocio('El carrito está vacío.');
  }
  if (lineas.length > MAX_LINEAS) {
    throw new ErrorNegocio('El carrito tiene demasiadas líneas.');
  }
  // Map: id de producto -> cantidad total. Si el mismo producto viene dos veces, se suman.
  const porProducto = new Map();
  for (const linea of lineas) {
    // Todo lo que viene del navegador se trata como no confiable: se convierte y se valida.
    const id = Number(linea?.id_producto);
    const cantidad = Number(linea?.cantidad);
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) {
      throw new ErrorNegocio(`Cada producto debe llevar entre 1 y ${MAX_CANTIDAD} unidades.`);
    }
    porProducto.set(id, (porProducto.get(id) ?? 0) + cantidad);
  }
  return [...porProducto].map(([id_producto, cantidad]) => ({ id_producto, cantidad }));
}

// Agrega el precio real de cada producto y comprueba que exista y haya stock.
// Devuelve las líneas con precio y el total en centavos.
async function valorarCarrito(lineas, ejecutor = pool) {
  // `ejecutor` permite usar la misma función dentro de una transacción (conexión) o fuera (pool).
  const ids = lineas.map((l) => l.id_producto);
  const [productos] = await ejecutor.query('SELECT id, nombre, precio, cantidad FROM producto WHERE id IN (?)', [ids]);
  const porId = new Map(productos.map((p) => [p.id, p]));

  // Se suma en centavos enteros: con decimales (0.1 + 0.2) JavaScript acumularía errores.
  let totalCentavos = 0;
  const valoradas = lineas.map((linea) => {
    const producto = porId.get(linea.id_producto);
    if (!producto) throw new ErrorNegocio('Un producto del carrito ya no existe.', 409);
    if (producto.cantidad < linea.cantidad) {
      throw new ErrorNegocio(`Stock insuficiente para "${producto.nombre}" (quedan ${producto.cantidad}).`, 409);
    }
    // El precio sale de la base de datos, JAMÁS del navegador.
    totalCentavos += centavos(producto.precio) * linea.cantidad;
    return { id_producto: producto.id, cantidad: linea.cantidad, precio_unitario: Number(producto.precio) };
  });
  return { lineas: valoradas, totalCentavos };
}

// Busca el id del empleado ficticio "Venta en línea" (ver NOMBRE_EMPLEADO_ONLINE).
async function idEmpleadoEnLinea() {
  const [filas] = await pool.query('SELECT id FROM empleado WHERE nombre = ? LIMIT 1', [NOMBRE_EMPLEADO_ONLINE]);
  if (filas.length === 0) {
    throw new ErrorNegocio('Falta ejecutar database/bd.sql en la base de datos.', 503);
  }
  return filas[0].id;
}

// Convierte "la tabla no existe" (script SQL sin ejecutar) en un mensaje útil.
function traducirTablaFaltante(error) {
  if (error.code === 'ER_NO_SUCH_TABLE') {
    return new ErrorNegocio('Falta ejecutar database/bd.sql en la base de datos.', 503);
  }
  return error;
}

// Actualiza el estado de un pago en pago_paypal. Estados: creada, procesando, completado,
// fallido, reembolsado y revision (algo raro que hay que revisar a mano).
// COALESCE conserva el capture_id anterior cuando no se manda uno nuevo.
async function marcarPago(id, estado, detalle = null, captureId = null) {
  await pool.query(
    'UPDATE pago_paypal SET estado = ?, detalle = ?, capture_id = COALESCE(?, capture_id) WHERE id = ?',
    [estado, detalle, captureId, id],
  );
}

// GET /api/checkout/config -> lo que necesita el navegador para cargar los botones de PayPal.
// El client id es público por diseño; el secreto jamás sale del servidor.
router.get('/config', (req, res) => {
  res.json({
    paypalHabilitado: paypal.configurado(),
    clientId: paypal.configurado() ? process.env.PAYPAL_CLIENT_ID : null,
    moneda: paypal.MONEDA,
    entorno: paypal.entorno(),
  });
});

// POST /api/checkout/paypal/orden  { lineas: [{ id_producto, cantidad }] } -> { orderId, total }
router.post('/paypal/orden', async (req, res) => {
  const { lineas, totalCentavos } = await valorarCarrito(leerLineas(req.body?.lineas));
  // Se valida el carrito ANTES de hablar con PayPal: el servidor calcula el total real.
  await idEmpleadoEnLinea(); // falla ya, antes de crear nada en PayPal, si falta el script SQL

  const total = totalCentavos / 100;
  // Referencia única por usuario y momento; PayPal la usa también para no duplicar la orden.
  const referencia = `pos-${req.usuario.id}-${Date.now()}`;
  const orderId = await paypal.crearOrden(total, referencia);

  // Se guarda lo que el servidor calculó (total y líneas): al capturar se compara contra esto,
  // no contra lo que diga el navegador.
  try {
    await pool.query(
      'INSERT INTO pago_paypal (order_id, id_usuario, total, moneda, lineas) VALUES (?, ?, ?, ?, ?)',
      [orderId, req.usuario.id, total, paypal.MONEDA, JSON.stringify(lineas)],
    );
  } catch (error) {
    throw traducirTablaFaltante(error);
  }
  res.status(201).json({ orderId, total });
});

// POST /api/checkout/paypal/capturar  { orderId } -> { idVenta, total }
router.post('/paypal/capturar', async (req, res) => {
  const orderId = String(req.body?.orderId ?? '');
  // El id de orden solo puede tener letras, números y guiones (evita basura en la consulta).
  if (!/^[A-Za-z0-9-]{5,64}$/.test(orderId)) throw new ErrorNegocio('La orden de pago no es válida.');

  // Solo se puede capturar una orden que ESTE usuario creó con este servidor.
  let pago;
  try {
    [[pago]] = await pool.query('SELECT * FROM pago_paypal WHERE order_id = ? AND id_usuario = ?', [orderId, req.usuario.id]);
  } catch (error) {
    throw traducirTablaFaltante(error);
  }
  if (!pago) throw new ErrorNegocio('No se encontró esa orden de pago.', 404);

  // Repetir la petición no cobra dos veces: se devuelve la venta ya registrada.
  if (pago.estado === 'completado') {
    return res.json({ idVenta: pago.id_venta, total: Number(pago.total), repetido: true });
  }
  // "Reclamar" la orden de forma atómica: si dos peticiones llegan a la vez, solo una pasa.
  const [reclamo] = await pool.query("UPDATE pago_paypal SET estado = 'procesando' WHERE id = ? AND estado = 'creada'", [pago.id]);
  if (reclamo.affectedRows === 0) {
    throw new ErrorNegocio('Esta orden de pago ya se está procesando o no se puede usar.', 409);
  }

  // Las líneas y el total salen de lo guardado al crear la orden, no de esta petición.
  const lineas = JSON.parse(pago.lineas);
  const totalCentavos = centavos(pago.total);

  // El stock pudo agotarse mientras el comprador pagaba: se revisa ANTES de cobrar.
  try {
    await valorarCarrito(lineas.map(({ id_producto, cantidad }) => ({ id_producto, cantidad })));
  } catch (error) {
    await marcarPago(pago.id, 'fallido', error.message.slice(0, 255));
    throw error;
  }

  // --- Cobro ---
  // capturarOrden() es el momento en que PayPal cobra realmente el dinero.
  let captura;
  try {
    const respuesta = await paypal.capturarOrden(orderId);
    captura = respuesta.datos?.purchase_units?.[0]?.payments?.captures?.[0];
    if (!respuesta.ok || respuesta.datos?.status !== 'COMPLETED' || !captura) {
      await marcarPago(pago.id, 'fallido', `PayPal respondió ${respuesta.estado}`);
      throw new ErrorNegocio('PayPal no completó el pago. No se te cobró nada.', 402);
    }
  } catch (error) {
    if (error instanceof ErrorNegocio) throw error;
    // Falla de red a mitad del cobro: no sabemos si PayPal cobró. Queda para revisar a mano.
    await marcarPago(pago.id, 'revision', 'Error de comunicación al capturar');
    console.error('Error al capturar el pago', orderId, error);
    throw new ErrorNegocio('No se pudo confirmar el pago con PayPal. Contacta al negocio con tu orden: ' + orderId, 502);
  }

  // --- Validación del cobro: estado, monto y moneda deben coincidir con lo que calculó el servidor ---
  const coincide =
    captura.status === 'COMPLETED' &&
    captura.amount?.currency_code === pago.moneda &&
    centavos(captura.amount?.value) === totalCentavos;
  if (!coincide) {
    await deshacerCobro(pago.id, captura.id, 'El monto o la moneda cobrados no coinciden con el pedido');
    throw new ErrorNegocio('El pago no coincide con el pedido y fue reembolsado.', 409);
  }

  // --- Registro de la venta (todo junto o nada) ---
  // conTransaccion agrupa los INSERT/UPDATE de abajo: si uno falla, se deshacen todos
  // (no puede quedar una venta sin stock descontado, ni al revés).
  let idVenta;
  try {
    const idEmpleado = await idEmpleadoEnLinea();
    idVenta = await conTransaccion(async (conexion) => {
      const ahora = new Date().toISOString();
      const [venta] = await conexion.query(
        'INSERT INTO venta (fecha, id_empleado, subtotal, descuento, total, metodo_pago, estado) VALUES (?, ?, ?, 0, ?, ?, ?)',
        // PayPal se guarda como 'tarjeta' (el CHECK de tu tabla solo admite efectivo/tarjeta);
        // el detalle del pago queda en pago_paypal.
        [isoAMysql(ahora), idEmpleado, pago.total, pago.total, 'tarjeta', 'confirmada'],
      );
      // Una fila por producto vendido (el `VALUES ?` inserta varias filas de una vez).
      await conexion.query(
        'INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario) VALUES ?',
        [lineas.map((l) => [venta.insertId, l.id_producto, l.cantidad, l.precio_unitario])],
      );
      // Se descuenta el stock; `AND cantidad >= ?` impide que quede negativo si otro cliente
      // compró lo mismo en ese instante.
      for (const linea of lineas) {
        const [resultado] = await conexion.query(
          'UPDATE producto SET cantidad = cantidad - ? WHERE id = ? AND cantidad >= ?',
          [linea.cantidad, linea.id_producto, linea.cantidad],
        );
        if (resultado.affectedRows === 0) throw new ErrorNegocio('El stock se agotó mientras pagabas.', 409);
      }
      // El ingreso se refleja en Finanzas, igual que las ventas del cajero.
      await conexion.query('INSERT INTO finanza (fecha, tipo, monto, origen) VALUES (?, ?, ?, ?)', [
        ahora.slice(0, 10),
        'ingreso_venta',
        pago.total,
        `Venta #${venta.insertId} (PayPal)`,
      ]);
      // El pago queda ligado a la venta: así se evita cobrar dos veces y se sabe de quién es.
      await conexion.query(
        "UPDATE pago_paypal SET estado = 'completado', capture_id = ?, id_venta = ?, pagado = ? WHERE id = ?",
        [captura.id, venta.insertId, isoAMysql(ahora), pago.id],
      );
      return venta.insertId;
    });
  } catch (error) {
    // Ya se cobró pero la venta no se guardó: se devuelve el dinero.
    console.error('No se pudo registrar la venta de la orden', orderId, error);
    const reembolsado = await deshacerCobro(pago.id, captura.id, 'No se pudo registrar la venta');
    throw new ErrorNegocio(
      error instanceof ErrorNegocio && reembolsado
        ? `${error.message} Tu pago fue reembolsado.`
        : 'No se pudo registrar la compra. Si se te cobró, contacta al negocio con tu orden: ' + orderId,
      error instanceof ErrorNegocio ? error.estado : 500,
    );
  }

  res.status(201).json({ idVenta, total: Number(pago.total) });
});

// Reembolsa una captura y deja constancia. Devuelve true si PayPal aceptó el reembolso.
async function deshacerCobro(idPago, captureId, motivo) {
  let reembolsado = false;
  try {
    reembolsado = (await paypal.reembolsar(captureId)).ok;
  } catch (error) {
    console.error('Falló el reembolso de la captura', captureId, error);
  }
  await marcarPago(idPago, reembolsado ? 'reembolsado' : 'revision', motivo, captureId);
  return reembolsado;
}

module.exports = router;
