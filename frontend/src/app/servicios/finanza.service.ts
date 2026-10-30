import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Finanza, FinanzaInput } from '../modelos/finanza.model';
import { mensajeErrorApi } from '../utilidades/api-errores';

// Servicio de movimientos financieros: mismo patrón que CategoriaService (ver ahí la explicación).
@Injectable({
  providedIn: 'root',
})
export class FinanzaService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/finanzas`;

  // GET /api/finanzas -> lista los movimientos, los más recientes primero.
  async listar(): Promise<{ data: Finanza[]; error: string | null }> {
    try {
      const data = await firstValueFrom(this.http.get<Finanza[]>(this.api));
      return { data, error: null };
    } catch (e) {
      return { data: [], error: mensajeErrorApi(e) };
    }
  }

  // POST /api/finanzas -> registra un movimiento manual.
  async crear(datos: FinanzaInput): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.post(this.api, datos));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }

  // PUT /api/finanzas/:id -> modifica un movimiento.
  async actualizar(id: number, datos: FinanzaInput): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.put(`${this.api}/${id}`, datos));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }

  // GET /api/finanzas/exportar-xml -> descarga el libro contable en XML (con el token del interceptor).
  async exportarXml(desde?: string, hasta?: string): Promise<{ error: string | null }> {
    try {
      const params: Record<string, string> = {};
      if (desde) params['desde'] = desde;
      if (hasta) params['hasta'] = hasta;
      const blob = await firstValueFrom(this.http.get(`${this.api}/exportar-xml`, { params, responseType: 'blob' }));
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'contabilidad.xml';
      enlace.click();
      URL.revokeObjectURL(url);
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }

  // DELETE /api/finanzas/:id -> elimina un movimiento.
  async eliminar(id: number): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.delete(`${this.api}/${id}`));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }
}
