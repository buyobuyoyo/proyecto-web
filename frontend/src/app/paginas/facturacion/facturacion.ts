import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FacturaModal } from '../../componentes/factura-modal/factura-modal';
import { FacturaService } from '../../servicios/factura.service';
import { VentaService } from '../../servicios/venta.service';
import { AuthService } from '../../servicios/auth.service';
import { Factura, ResultadoCorreo } from '../../modelos/factura.model';
import { Venta } from '../../modelos/venta.model';

// Página de Facturación: lista los comprobantes XML, permite descargarlos y reenviarlos por correo.
// El administrador además ve las ventas que aún no tienen factura y puede generarlas;
// el cliente solo ve las facturas de sus compras.
@Component({
  selector: 'app-facturacion',
  imports: [DatePipe, FacturaModal],
  templateUrl: './facturacion.html',
  styleUrl: './facturacion.css',
})
export class Facturacion {
  private facturaService = inject(FacturaService);
  private ventaService = inject(VentaService);
  auth = inject(AuthService);

  facturas = signal<Factura[]>([]);
  ventas = signal<Venta[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  aviso = signal<string | null>(null);
  // Venta que se está facturando en el modal (null = modal cerrado).
  // (El valor se pasa al modal: el modal se abre cuando recibe un id y se cierra con null.)
  ventaAFacturar = signal<number | null>(null);

  // Ventas confirmadas que todavía no tienen factura (solo las carga el administrador).
  // Se arma un Set con los ids de venta que ya tienen factura (buscar en un Set es rápido) y se
  // dejan solo las confirmadas que no están ahí.
  ventasSinFactura = computed(() => {
    const facturadas = new Set(this.facturas().map((f) => f.id_venta));
    return this.ventas().filter((v) => v.estado === 'confirmada' && !facturadas.has(v.id));
  });

  constructor() {
    this.cargar();
  }

  async cargar() {
    // Facturas y ventas se piden a la vez. El cliente no puede listar ventas (solo el admin), así
    // que para él se usa una respuesta vacía en lugar de llamar al API.
    const [facturas, ventas] = await Promise.all([
      this.facturaService.listar(),
      this.auth.esAdmin() ? this.ventaService.listar() : Promise.resolve({ data: [] as Venta[], error: null }),
    ]);
    this.facturas.set(facturas.data);
    this.ventas.set(ventas.data);
    this.error.set(facturas.error ?? ventas.error);
    this.cargando.set(false);
  }

  // Se ejecuta cuando el modal avisa que se creó la factura: cierra el modal, avisa y recarga.
  async alCrear(resultado: ResultadoCorreo & { folio: string }) {
    this.ventaAFacturar.set(null);
    this.aviso.set(this.textoCorreo(`Factura ${resultado.folio} generada.`, resultado));
    await this.cargar();
  }

  // Descarga el archivo XML de la factura.
  async descargar(factura: Factura) {
    const { error } = await this.facturaService.descargarXml(factura);
    this.error.set(error);
  }

  // Vuelve a mandar el correo con el XML (útil si el primer envío falló).
  async reenviar(factura: Factura) {
    const { data, error } = await this.facturaService.reenviar(factura.id);
    this.error.set(error);
    if (data) this.aviso.set(this.textoCorreo(`Correo de ${factura.folio}:`, data));
    await this.cargar();
  }

  // Convierte el estado del correo (enviado, omitido, fallido...) en una frase legible.
  private textoCorreo(prefijo: string, r: ResultadoCorreo): string {
    const estados = {
      enviado: 'enviado por correo',
      omitido: 'el correo no se envió porque el servidor no tiene el servicio de correo configurado',
      fallido: 'el correo no se pudo enviar',
      pendiente: 'correo pendiente',
    };
    return `${prefijo} ${estados[r.correo_estado]}${r.correo_detalle ? ` (${r.correo_detalle})` : ''}.`;
  }
}
