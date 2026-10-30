import { Component, ElementRef, PLATFORM_ID, computed, effect, inject, signal, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ProductoService } from '../../servicios/producto.service';
import { CheckoutService, ConfigCheckout } from '../../servicios/checkout.service';
import { Producto } from '../../modelos/producto.model';
import { FacturaModal } from '../../componentes/factura-modal/factura-modal';
import { ResultadoCorreo } from '../../modelos/factura.model';

// TypeScript no conoce el SDK de PayPal (se carga como <script> externo), así que se declaran
// aquí solo las partes que usamos para que el compilador las acepte.
// Parte de la API del SDK de PayPal que usamos (el SDK se carga como <script> externo).
interface BotonesPaypal {
  render(contenedor: HTMLElement): Promise<void>;
}
interface PaypalSdk {
  Buttons(opciones: {
    createOrder: () => Promise<string>;
    onApprove: (datos: { orderID: string }) => Promise<void>;
    onCancel: () => void;
    onError: () => void;
  }): BotonesPaypal;
}
// Agrega la propiedad `paypal` al objeto global `window` (el SDK la crea al cargarse).
declare global {
  interface Window {
    paypal?: PaypalSdk;
  }
}

// Página de Checkout: el usuario arma su carrito y paga con PayPal. El carrito solo lleva
// producto + cantidad; el precio, el total y la validación del pago los hace el backend.
@Component({
  selector: 'app-checkout',
  imports: [FacturaModal],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  private productoService = inject(ProductoService);
  private checkoutService = inject(CheckoutService);
  // El SSR renderiza en el servidor, donde no existe `window` ni `document`: se protege con esto.
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  productos = signal<Producto[]>([]);
  // Carrito: id del producto -> cantidad.
  carrito = signal<Record<number, number>>({});
  cargando = signal(true);
  error = signal<string | null>(null);
  config = signal<ConfigCheckout | null>(null);
  cobrando = signal(false);
  // Mensaje de la última compra exitosa.
  exito = signal<string | null>(null);
  // Venta recién pagada (para ofrecer su factura) y si el modal de factura está abierto.
  ventaPagada = signal<number | null>(null);
  facturando = signal<number | null>(null);

  // viewChild apunta al <div #contenedorPaypal> de la plantilla: ahí PayPal dibuja sus botones.
  contenedorPaypal = viewChild<ElementRef<HTMLElement>>('contenedorPaypal');
  // Evita dibujar los botones de PayPal dos veces.
  private botonesRenderizados = false;

  // Líneas del carrito con los datos del producto, solo para mostrarlas. El total que se
  // ve aquí es informativo: el cobro real lo calcula el servidor.
  lineas = computed(() => {
    const carrito = this.carrito();
    return this.productos()
      .filter((p) => carrito[p.id] > 0)
      .map((p) => ({ producto: p, cantidad: carrito[p.id], importe: p.precio * carrito[p.id] }));
  });
  total = computed(() => this.lineas().reduce((suma, l) => suma + l.importe, 0));

  constructor() {
    this.cargar();
    // effect() se ejecuta de nuevo cuando cambia algún signal que lee dentro (contenedor o config).
    // Cuando el contenedor ya existe en pantalla y PayPal está activo, se dibujan los botones.
    effect(() => {
      const contenedor = this.contenedorPaypal();
      const config = this.config();
      if (contenedor && config?.paypalHabilitado && config.clientId && !this.botonesRenderizados) {
        this.botonesRenderizados = true;
        this.dibujarBotones(contenedor.nativeElement, config);
      }
    });
  }

  async cargar() {
    // Promise.all lanza las dos peticiones a la vez y espera a que terminen ambas.
    const [productos, config] = await Promise.all([this.productoService.listar(), this.checkoutService.config()]);
    this.productos.set(productos.data);
    this.config.set(config.data);
    this.error.set(productos.error ?? config.error);
    this.cargando.set(false);
  }

  // Suma una unidad al carrito sin pasarse del stock disponible.
  agregar(producto: Producto) {
    const actual = this.carrito()[producto.id] ?? 0;
    if (actual >= producto.cantidad) return; // no más que el stock
    // update() recibe el valor actual y devuelve uno NUEVO (copia con `...c`); así el signal detecta el cambio.
    this.carrito.update((c) => ({ ...c, [producto.id]: actual + 1 }));
  }

  // Resta una unidad; Math.max evita que baje de 0.
  quitar(producto: Producto) {
    const actual = this.carrito()[producto.id] ?? 0;
    this.carrito.update((c) => ({ ...c, [producto.id]: Math.max(0, actual - 1) }));
  }

  // Carga el SDK de PayPal una sola vez y dibuja los botones.
  private async dibujarBotones(contenedor: HTMLElement, config: ConfigCheckout) {
    if (!this.esNavegador) return;
    try {
      await this.cargarSdk(config);
    } catch {
      this.error.set('No se pudo cargar PayPal. Revisa tu conexión.');
      this.botonesRenderizados = false;
      return;
    }

    // El "!" le dice a TypeScript que paypal ya existe (cargarSdk terminó sin error).
    window.paypal!
      .Buttons({
        // 1. El navegador pide al backend que cree la orden (el backend calcula el total).
        createOrder: async () => {
          this.error.set(null);
          const lineas = this.lineas().map((l) => ({ id_producto: l.producto.id, cantidad: l.cantidad }));
          const { data, error } = await this.checkoutService.crearOrden(lineas);
          if (error || !data) {
            this.error.set(error ?? 'No se pudo iniciar el pago.');
            throw new Error(error ?? 'orden');
          }
          return data.orderId;
        },
        // 2. El comprador aprobó en PayPal: el backend cobra, valida y registra la venta.
        onApprove: async ({ orderID }) => {
          this.cobrando.set(true);
          const { data, error } = await this.checkoutService.capturar(orderID);
          this.cobrando.set(false);
          if (error || !data) {
            this.error.set(error ?? 'No se pudo confirmar el pago.');
            return;
          }
          this.exito.set(`¡Gracias por tu compra! Venta #${data.idVenta} por $${data.total.toFixed(2)}.`);
          this.carrito.set({});
          this.ventaPagada.set(data.idVenta);
          const { data: productos } = await this.productoService.listar(); // stock actualizado
          this.productos.set(productos);
        },
        onCancel: () => this.error.set('Cancelaste el pago. No se te cobró nada.'),
        onError: () => this.error.set('PayPal tuvo un problema. Inténtalo de nuevo.'),
      })
      .render(contenedor);
  }

  // Se ejecuta cuando el modal de factura avisa que la factura ya se generó.
  alFacturar(resultado: ResultadoCorreo & { folio: string }) {
    this.facturando.set(null);
    this.ventaPagada.set(null);
    this.exito.set(
      resultado.correo_estado === 'enviado'
        ? `Factura ${resultado.folio} generada y enviada a tu correo.`
        : `Factura ${resultado.folio} generada. Puedes descargarla en Facturación.`,
    );
  }

  // Inserta el <script> del SDK de PayPal en la página y espera a que termine de cargar.
  // Si ya estaba cargado, no hace nada.
  private cargarSdk(config: ConfigCheckout): Promise<void> {
    if (window.paypal) return Promise.resolve();
    return new Promise((resolver, rechazar) => {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(config.clientId!)}&currency=${config.moneda}&intent=capture`;
      script.onload = () => resolver();
      script.onerror = () => rechazar();
      document.head.appendChild(script);
    });
  }
}
