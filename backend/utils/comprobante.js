// Genera el XML del comprobante de una venta. Es un comprobante interno de la cafetería,
// NO un CFDI: no está timbrado ni tiene validez fiscal (el propio XML lo indica).

// Escapa los caracteres que romperían el XML (&, <, >, comillas).
function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Formatea siempre con 2 decimales ("12.50") como se acostumbra en un comprobante.
const dinero = (n) => Number(n).toFixed(2);

// venta:    fila de `venta` (fecha, subtotal, descuento, total, metodo_pago)
// lineas:   [{ nombre, cantidad, precio_unitario }]
// receptor: { folio, nombre, rfc }
function generarComprobante(venta, lineas, receptor) {
  // Una línea <Concepto> por producto: importe = cantidad x precio unitario.
  const conceptos = lineas
    .map(
      (l) =>
        `    <Concepto descripcion="${esc(l.nombre)}" cantidad="${l.cantidad}" ` +
        `precioUnitario="${dinero(l.precio_unitario)}" importe="${dinero(l.cantidad * l.precio_unitario)}"/>`,
    )
    .join('\n');

  // Plantilla de texto (template literal): los ${...} se sustituyen por los datos, siempre
  // pasando por esc() para que un nombre con "&" o "<" no rompa el XML.
  return `<?xml version="1.0" encoding="UTF-8"?>
<Comprobante folio="${esc(receptor.folio)}" fecha="${esc(venta.fecha)}" moneda="MXN" metodoPago="${esc(venta.metodo_pago)}" subtotal="${dinero(venta.subtotal)}" descuento="${dinero(venta.descuento)}" total="${dinero(venta.total)}">
  <Emisor nombre="Cafetería SweetSpot"/>
  <Receptor nombre="${esc(receptor.nombre)}" rfc="${esc(receptor.rfc)}"/>
  <Conceptos>
${conceptos}
  </Conceptos>
  <Aviso>Comprobante interno sin validez fiscal</Aviso>
</Comprobante>
`;
}

// Se exporta esc() también para que otros generadores de XML (contabilidad) la reutilicen.
module.exports = { generarComprobante, esc };
