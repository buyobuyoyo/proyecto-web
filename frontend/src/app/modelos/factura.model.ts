export type EstadoCorreo = 'pendiente' | 'enviado' | 'fallido' | 'omitido';

// Una factura tal como la devuelve GET /api/facturas (sin el XML; ese se descarga aparte).
export interface Factura {
  id: number;
  id_venta: number;
  folio: string;
  nombre_receptor: string;
  rfc_receptor: string;
  correo_receptor: string;
  creada: string; // timestamp ISO
  correo_estado: EstadoCorreo;
  correo_enviado: string | null;
  correo_detalle: string | null;
  total: number;
}

// Datos del receptor que se piden al facturar una venta.
export interface FacturaInput {
  id_venta: number;
  nombre_receptor: string;
  rfc_receptor: string;
  correo_receptor: string;
}

// Respuesta de crear o reenviar: cómo quedó el envío del correo.
export interface ResultadoCorreo {
  correo_estado: EstadoCorreo;
  correo_detalle: string | null;
}
