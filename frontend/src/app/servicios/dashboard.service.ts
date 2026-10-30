import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Dashboard } from '../modelos/dashboard.model';
import { mensajeErrorApi } from '../utilidades/api-errores';

// Resumen del panel del administrador. Mismo patrón que CategoriaService (ver ahí la explicación).
@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/dashboard`;

  // GET /api/dashboard -> ventas de hoy, balance del mes, más vendidos y stock bajo.
  // Devuelve { data, error } como los demás servicios; mensajeErrorApi traduce el error HTTP a texto.
  async obtener(): Promise<{ data: Dashboard | null; error: string | null }> {
    try {
      const data = await firstValueFrom(this.http.get<Dashboard>(this.api));
      return { data, error: null };
    } catch (e) {
      return { data: null, error: mensajeErrorApi(e) };
    }
  }
}
