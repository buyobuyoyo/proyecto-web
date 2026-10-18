import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Categoria, CategoriaInput } from '../modelos/categoria.model';
import { mensajeErrorApi } from '../utilidades/api-errores';

/*
   Un SERVICIO es una clase que concentra la comunicación con el backend, para que las páginas
   no tengan que armar peticiones HTTP. Este es el patrón que siguen TODOS los servicios:

   - `@Injectable({ providedIn: 'root' })`: Angular crea UNA sola instancia para toda la app y
     la entrega a quien la pida con `inject(CategoriaService)`.
   - `inject(HttpClient)`: pide a Angular la herramienta para hacer peticiones HTTP.
   - Cada método devuelve siempre un objeto ({ data, error } o { error }) en vez de lanzar
     excepciones. Así la página solo revisa `error` y no necesita try/catch.
   - `firstValueFrom(...)`: HttpClient devuelve un Observable (flujo de datos); esto lo convierte
     en una Promesa para poder usar async/await y esperar la única respuesta.
 */
@Injectable({
  providedIn: 'root',
})
export class CategoriaService {
  private http = inject(HttpClient);
  // Dirección base del recurso: http://localhost:3200/api/categorias
  private api = `${environment.apiUrl}/categorias`;

  // GET /api/categorias -> lista todas las categorías.
  async listar(): Promise<{ data: Categoria[]; error: string | null }> {
    try {
      // `get<Categoria[]>` indica el tipo esperado de la respuesta (solo ayuda al compilador).
      const data = await firstValueFrom(this.http.get<Categoria[]>(this.api));
      return { data, error: null };
    } catch (e) {
      // Si falla, se devuelve una lista vacía y el mensaje ya traducido a español.
      return { data: [], error: mensajeErrorApi(e) };
    }
  }

  // POST /api/categorias -> crea una categoría nueva con `datos` en el cuerpo.
  async crear(datos: CategoriaInput): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.post(this.api, datos));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }

  // PUT /api/categorias/:id -> modifica la categoría con ese id.
  async actualizar(id: number, datos: CategoriaInput): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.put(`${this.api}/${id}`, datos));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }

  // DELETE /api/categorias/:id -> elimina la categoría (el backend la rechaza si tiene productos).
  async eliminar(id: number): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.delete(`${this.api}/${id}`));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }
}
