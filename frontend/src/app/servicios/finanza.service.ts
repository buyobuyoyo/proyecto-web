import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Finanza, FinanzaInput } from '../modelos/finanza.model';
import { mensajeErrorApi } from '../utilidades/api-errores';

@Injectable({
  providedIn: 'root',
})
export class FinanzaService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/finanzas`;

  async listar(): Promise<{ data: Finanza[]; error: string | null }> {
    try {
      const data = await firstValueFrom(this.http.get<Finanza[]>(this.api));
      return { data, error: null };
    } catch (e) {
      return { data: [], error: mensajeErrorApi(e) };
    }
  }

  async crear(datos: FinanzaInput): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.post(this.api, datos));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }

  async actualizar(id: number, datos: FinanzaInput): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.put(`${this.api}/${id}`, datos));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }

  async eliminar(id: number): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.delete(`${this.api}/${id}`));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }
}
