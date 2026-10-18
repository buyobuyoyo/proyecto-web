import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Compra, CompraInput, EstadoCompra } from '../modelos/compra.model';
import { DetalleCompra, LineaCompraForm } from '../modelos/detalle-compra.model';
import { mensajeErrorApi } from '../utilidades/api-errores';

/*
   Antes este servicio hacía todos los pasos (encabezado, líneas, stock, gasto en finanzas)
   uno por uno contra Supabase. Ahora manda la compra completa al backend y allí corre
   en una sola transacción (ver backend/routes/compras.js).
   Mismo patrón que CategoriaService (ver ahí la explicación completa).
 */
@Injectable({
  providedIn: 'root',
})
export class CompraService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/compras`;

  // GET /api/compras -> lista las compras, cada una con su proveedor.
  async listar(): Promise<{ data: Compra[]; error: string | null }> {
    try {
      const data = await firstValueFrom(this.http.get<Compra[]>(this.api));
      return { data, error: null };
    } catch (e) {
      return { data: [], error: mensajeErrorApi(e) };
    }
  }

  // GET /api/compras/:id/detalles -> las líneas de una compra (para editarla en el formulario).
  async listarDetalles(idCompra: number): Promise<{ data: DetalleCompra[]; error: string | null }> {
    try {
      const data = await firstValueFrom(this.http.get<DetalleCompra[]>(`${this.api}/${idCompra}/detalles`));
      return { data, error: null };
    } catch (e) {
      return { data: [], error: mensajeErrorApi(e) };
    }
  }

  // POST /api/compras -> crea la compra y sus líneas en un solo envío ({ compra, lineas }).
  async crear(compra: CompraInput, lineas: LineaCompraForm[]): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.post(this.api, { compra, lineas }));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }

  // `_estadoAnterior` ya no se envía: el backend lee el estado real desde la base de datos
  // (más seguro). Se conserva el parámetro para no tener que cambiar la página de compras.
  // (El guion bajo inicial es la convención de "parámetro que no se usa".)
  // PUT /api/compras/:id -> reemplaza el encabezado y todas las líneas.
  async actualizar(
    id: number,
    compra: CompraInput,
    lineas: LineaCompraForm[],
    _estadoAnterior: EstadoCompra,
  ): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.put(`${this.api}/${id}`, { compra, lineas }));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }

  // DELETE /api/compras/:id -> elimina la compra y sus líneas.
  async eliminar(id: number): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.delete(`${this.api}/${id}`));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }
}
