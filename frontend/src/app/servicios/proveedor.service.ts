import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Proveedor, ProveedorInput } from '../modelos/proveedor.model';
import { mensajeErrorApi } from '../utilidades/api-errores';

// Servicio de proveedores: mismo patrón que CategoriaService (ver ahí la explicación completa).
@Injectable({
  providedIn: 'root',
})
export class ProveedorService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/proveedores`;

  // GET /api/proveedores -> lista todos.
  async listar(): Promise<{ data: Proveedor[]; error: string | null }> {
    try {
      const data = await firstValueFrom(this.http.get<Proveedor[]>(this.api));
      return { data, error: null };
    } catch (e) {
      return { data: [], error: mensajeErrorApi(e) };
    }
  }

  // POST /api/proveedores -> crea uno nuevo.
  async crear(datos: ProveedorInput): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.post(this.api, datos));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }

  // PUT /api/proveedores/:id -> modifica uno existente.
  async actualizar(id: number, datos: ProveedorInput): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.put(`${this.api}/${id}`, datos));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }

  // DELETE /api/proveedores/:id -> elimina uno (el backend lo rechaza si tiene compras).
  async eliminar(id: number): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.delete(`${this.api}/${id}`));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }
}
