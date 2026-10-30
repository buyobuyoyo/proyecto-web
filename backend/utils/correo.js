// Envío de correo con la API de Resend (https://resend.com). Las claves salen de backend/.env:
//   RESEND_API_KEY  -> API key de tu cuenta de Resend
//   MAIL_FROM       -> remitente, por ejemplo "Cafetería <onboarding@resend.dev>"
//   MAIL_DESTINO    -> (opcional) fuerza TODOS los correos a esta dirección. Sin un dominio
//                      verificado en Resend, solo puedes enviar al correo de tu propia cuenta:
//                      ponlo aquí mientras pruebas.

// ¿Hay API key y remitente en .env? Si no, enviarCorreo() lo informa en lugar de fallar.
function configurado() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

// Envía un correo de texto con archivos adjuntos [{ nombre, contenido }].
// Nunca lanza: devuelve { estado: 'enviado' | 'fallido' | 'omitido', detalle } para que quien
// llama lo guarde; un correo caído no debe deshacer una factura ya generada.
async function enviarCorreo({ para, asunto, texto, adjuntos = [] }) {
  if (!configurado()) {
    return { estado: 'omitido', detalle: 'Falta RESEND_API_KEY o MAIL_FROM en backend/.env' };
  }
  // Si MAIL_DESTINO existe, se usa SIEMPRE (útil en pruebas); si no, el correo del receptor.
  const destino = process.env.MAIL_DESTINO || para;
  try {
    // Resend es un servicio web: se le manda el correo con una petición HTTP (fetch) y la API key.
    const respuesta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        to: [destino],
        subject: asunto,
        text: texto,
        // Los adjuntos viajan como texto en Base64.
        attachments: adjuntos.map((a) => ({
          filename: a.nombre,
          content: Buffer.from(a.contenido, 'utf8').toString('base64'),
        })),
      }),
    });
    // Resend rechazó el envío (por ejemplo, dominio no verificado): se devuelve su motivo.
    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => ({}));
      return { estado: 'fallido', detalle: String(cuerpo.message ?? `Resend respondió ${respuesta.status}`).slice(0, 255) };
    }
    return { estado: 'enviado', detalle: destino === para ? null : `Enviado a ${destino} (MAIL_DESTINO)` };
  } catch (error) {
    // Error de red: nunca se lanza, para que la factura ya creada no se pierda.
    console.error('Error al enviar correo:', error);
    return { estado: 'fallido', detalle: 'No se pudo conectar con el servicio de correo' };
  }
}

module.exports = { configurado, enviarCorreo };
