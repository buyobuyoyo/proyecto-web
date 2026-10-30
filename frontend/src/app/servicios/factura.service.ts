import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Factura, FacturaInput, ResultadoCorreo } from '../modelos/factura.model';
import { mensajeErrorApi } from '../utilidades/api-errores';

// Facturas XML de las ventas. Mismo patrón que CategoriaService (ver ahí la explicación).
@Injectable({
  providedIn: 'root',
})
export class FacturaService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/facturas`;

  // GET /api/facturas -> el administrador ve todas; el cliente, solo las de sus compras.
  async listar(): Promise<{ data: Factura[]; error: string | null }> {
    try {
      const data = await firstValueFrom(this.http.get<Factura[]>(this.api));
      return { data, error: null };
    } catch (e) {
      return { data: [], error: mensajeErrorApi(e) };
    }
  }

  // POST /api/facturas -> genera el XML y lo envía por correo (si el servidor tiene correo configurado).
  async crear(datos: FacturaInput): Promise<{ data: (ResultadoCorreo & { folio: string }) | null; error: string | null }> {
    try {
      const data = await firstValueFrom(this.http.post<ResultadoCorreo & { folio: string }>(this.api, datos));
      return { data, error: null };
    } catch (e) {
      return { data: null, error: mensajeErrorApi(e) };
    }
  }

  // POST /api/facturas/:id/reenviar -> vuelve a mandar el correo con el XML.
  async reenviar(id: number): Promise<{ data: ResultadoCorreo | null; error: string | null }> {
    try {
      const data = await firstValueFrom(this.http.post<ResultadoCorreo>(`${this.api}/${id}/reenviar`, {}));
      return { data, error: null };
    } catch (e) {
      return { data: null, error: mensajeErrorApi(e) };
    }
  }

  // GET /api/facturas/:id/xml -> descarga el archivo. Se pide con HttpClient (y no con un
  // enlace normal) para que el interceptor le agregue el token de sesión.
  async descargarXml(factura: Factura): Promise<{ error: string | null }> {
    try {
      const blob = await firstValueFrom(this.http.get(`${this.api}/${factura.id}/xml`, { responseType: 'blob' }));
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `${factura.folio}.xml`;
      enlace.click();
      URL.revokeObjectURL(url);
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }
}
