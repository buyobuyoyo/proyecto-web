import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { mensajeErrorApi } from '../utilidades/api-errores';

// Lo que se manda al servidor: solo qué producto y cuánto. El precio lo calcula el backend.
export interface LineaCheckout {
  id_producto: number;
  cantidad: number;
}

export interface ConfigCheckout {
  paypalHabilitado: boolean;
  clientId: string | null;
  moneda: string;
  entorno: 'sandbox' | 'live';
}

// Llamadas del checkout con PayPal. Mismo patrón que CategoriaService (ver ahí la explicación).
@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/checkout`;

  // GET /api/checkout/config -> si PayPal está activo y con qué client id cargar los botones.
  // Todos los métodos devuelven { data, error }: o hay datos o hay un mensaje, nunca se lanza una
  // excepción hacia la pantalla. firstValueFrom convierte la respuesta HTTP (Observable) en Promise.
  async config(): Promise<{ data: ConfigCheckout | null; error: string | null }> {
    try {
      const data = await firstValueFrom(this.http.get<ConfigCheckout>(`${this.api}/config`));
      return { data, error: null };
    } catch (e) {
      return { data: null, error: mensajeErrorApi(e) };
    }
  }

  // POST /api/checkout/paypal/orden -> el servidor calcula el total y crea la orden en PayPal.
  async crearOrden(lineas: LineaCheckout[]): Promise<{ data: { orderId: string; total: number } | null; error: string | null }> {
    try {
      const data = await firstValueFrom(
        this.http.post<{ orderId: string; total: number }>(`${this.api}/paypal/orden`, { lineas }),
      );
      return { data, error: null };
    } catch (e) {
      return { data: null, error: mensajeErrorApi(e) };
    }
  }

  // POST /api/checkout/paypal/capturar -> el servidor cobra, valida el pago y registra la venta.
  async capturar(orderId: string): Promise<{ data: { idVenta: number; total: number } | null; error: string | null }> {
    try {
      const data = await firstValueFrom(
        this.http.post<{ idVenta: number; total: number }>(`${this.api}/paypal/capturar`, { orderId }),
      );
      return { data, error: null };
    } catch (e) {
      return { data: null, error: mensajeErrorApi(e) };
    }
  }
}
