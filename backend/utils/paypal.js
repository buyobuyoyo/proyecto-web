// Cliente mínimo de la API REST de PayPal (v2). Solo lo que usa el checkout:
// crear una orden, capturarla y reembolsar una captura.
//
// Las claves salen de backend/.env (nunca del código):
//   PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET  -> de tu app en developer.paypal.com
//   PAYPAL_ENV                              -> 'sandbox' (por defecto) o 'live'
const { ErrorNegocio } = require('./errores');

const MONEDA = 'MXN';
// PayPal tiene dos servidores: sandbox (dinero de mentira, para pruebas) y live (dinero real).
const BASES = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

// Devuelve 'live' solo si .env lo pide explícitamente; ante cualquier duda, sandbox.
function entorno() {
  return process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox';
}

// ¿Están las dos claves en .env? Si no, el checkout avisa en vez de fallar a medias.
function configurado() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

// Token de acceso (OAuth). Se guarda en memoria hasta poco antes de que venza.
// Pedir un token en cada llamada sería lento; se reutiliza mientras siga vigente.
let tokenEnCache = null;

// PayPal usa OAuth: se envían el client id y el secreto (en Base64, formato "Basic") y se recibe
// un token temporal con el que se firman las demás llamadas.

async function obtenerToken() {
  if (!configurado()) {
    throw new ErrorNegocio('El pago con PayPal no está configurado en el servidor.', 503);
  }
  // Si el token vence en menos de 1 minuto se pide uno nuevo (60_000 ms).
  if (tokenEnCache && tokenEnCache.vence > Date.now() + 60_000) return tokenEnCache.valor;

  const credenciales = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
  ).toString('base64');
  const respuesta = await fetch(`${BASES[entorno()]}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credenciales}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!respuesta.ok) {
    console.error('PayPal rechazó las credenciales:', respuesta.status);
    throw new ErrorNegocio('No se pudo conectar con PayPal. Revisa las credenciales del servidor.', 502);
  }
  const datos = await respuesta.json();
  tokenEnCache = { valor: datos.access_token, vence: Date.now() + datos.expires_in * 1000 };
  return tokenEnCache.valor;
}

// Llamada autenticada. Devuelve { ok, estado, datos } sin lanzar por errores HTTP de PayPal,
// para que quien llama decida qué hacer (por ejemplo, reembolsar).
async function llamar(ruta, { metodo = 'POST', cuerpo, idempotencia } = {}) {
  const token = await obtenerToken();
  // `PayPal-Request-Id` es una llave de idempotencia: si se repite la misma petición, PayPal
  // devuelve el resultado anterior en vez de cobrar otra vez.
  const encabezados = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  if (idempotencia) encabezados['PayPal-Request-Id'] = idempotencia;
  const respuesta = await fetch(`${BASES[entorno()]}${ruta}`, {
    method: metodo,
    headers: encabezados,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  // Si la respuesta no es JSON válido se usa un objeto vacío en lugar de lanzar un error.
  const datos = await respuesta.json().catch(() => ({}));
  return { ok: respuesta.ok, estado: respuesta.status, datos };
}

// Crea la orden por `total` pesos (número con 2 decimales). `referencia` es solo informativa.
async function crearOrden(total, referencia) {
  const { ok, datos } = await llamar('/v2/checkout/orders', {
    cuerpo: {
      // CAPTURE = el cobro se hace al instante cuando el comprador aprueba (no solo se reserva).
      intent: 'CAPTURE',
      purchase_units: [
        { reference_id: referencia, amount: { currency_code: MONEDA, value: total.toFixed(2) } },
      ],
    },
    idempotencia: referencia,
  });
  if (!ok || !datos.id) {
    console.error('PayPal no creó la orden:', JSON.stringify(datos));
    throw new ErrorNegocio('PayPal no pudo crear la orden de pago.', 502);
  }
  return datos.id;
}

// Captura (cobra) una orden aprobada por el comprador. Devuelve la respuesta cruda de PayPal;
// el llamador debe VALIDAR estado, monto y moneda antes de dar la venta por buena.
async function capturarOrden(orderId) {
  return llamar(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { idempotencia: `cap-${orderId}` });
}

// Devuelve el dinero de una captura. Se usa si se cobró pero la venta no pudo guardarse.
async function reembolsar(captureId) {
  return llamar(`/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
    cuerpo: {},
    idempotencia: `ref-${captureId}`,
  });
}

module.exports = { MONEDA, entorno, configurado, crearOrden, capturarOrden, reembolsar };
