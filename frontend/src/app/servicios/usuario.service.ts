import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Usuario, UsuarioInput } from '../modelos/usuario.model';
import { mensajeErrorApi } from '../utilidades/api-errores';

// CRUD de usuarios (solo administrador). Mismo patrón que CategoriaService (ver ahí la explicación).
@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private http = inject(HttpClient);
  // La URL base sale de environment (así cambia entre desarrollo y producción sin tocar el código).
  private api = `${environment.apiUrl}/usuarios`;

  // GET /api/usuarios -> lista de usuarios (sin contraseñas).
  async listar(): Promise<{ data: Usuario[]; error: string | null }> {
    try {
      const data = await firstValueFrom(this.http.get<Usuario[]>(this.api));
      return { data, error: null };
    } catch (e) {
      return { data: [], error: mensajeErrorApi(e) };
    }
  }

  // POST /api/usuarios -> crea una cuenta nueva.
  async crear(datos: UsuarioInput): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.post(this.api, datos));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }

  // PUT /api/usuarios/:id -> modifica la cuenta (la contraseña solo cambia si se envía).
  async actualizar(id: number, datos: UsuarioInput): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.put(`${this.api}/${id}`, datos));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }

  // DELETE /api/usuarios/:id -> elimina la cuenta (el backend rechaza borrar la propia o el último administrador).
  async eliminar(id: number): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.delete(`${this.api}/${id}`));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }
}
