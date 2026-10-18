import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Empleado } from '../modelos/empleado.model';
import { mensajeErrorApi } from '../utilidades/api-errores';

/*
   RH es solo de consulta (alcance acordado): este servicio únicamente lista empleados.
   No hay crear / actualizar / eliminar, y el backend tampoco tiene esas rutas.
 */
@Injectable({
  providedIn: 'root',
})
export class EmpleadoService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/empleados`;

  async listar(): Promise<{ data: Empleado[]; error: string | null }> {
    try {
      const data = await firstValueFrom(this.http.get<Empleado[]>(this.api));
      return { data, error: null };
    } catch (e) {
      return { data: [], error: mensajeErrorApi(e) };
    }
  }
}
