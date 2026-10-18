import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Producto, ProductoInput } from '../modelos/producto.model';
import { mensajeErrorApi } from '../utilidades/api-errores';

@Injectable({
  providedIn: 'root',
})
export class ProductoService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/productos`;

  async listar(): Promise<{ data: Producto[]; error: string | null }> {
    try {
      // El backend ya devuelve cada producto con su categoría anidada.
      const data = await firstValueFrom(this.http.get<Producto[]>(this.api));
      return { data, error: null };
    } catch (e) {
      return { data: [], error: mensajeErrorApi(e) };
    }
  }

  async crear(datos: ProductoInput): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.post(this.api, datos));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }

  async actualizar(id: number, datos: ProductoInput): Promise<{ error: string | null }> {
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
