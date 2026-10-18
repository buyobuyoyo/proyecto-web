import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Venta, VentaInput, EstadoVenta } from '../modelos/venta.model';
import { DetalleVenta, LineaVentaForm } from '../modelos/detalle-venta.model';
import { mensajeErrorApi } from '../utilidades/api-errores';

/*
   Antes este servicio hacía todos los pasos (encabezado, líneas, descuento de stock,
   ingreso en finanzas) uno por uno contra Supabase. Ahora manda la venta completa al
   backend y allí corre en una sola transacción (ver backend/routes/ventas.js).
   Mismo patrón que CategoriaService (ver ahí la explicación completa).
 */
@Injectable({
  providedIn: 'root',
})
export class VentaService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/ventas`;

  // GET /api/ventas -> lista las ventas, cada una con su empleado (cajero).
  async listar(): Promise<{ data: Venta[]; error: string | null }> {
    try {
      const data = await firstValueFrom(this.http.get<Venta[]>(this.api));
      return { data, error: null };
    } catch (e) {
      return { data: [], error: mensajeErrorApi(e) };
    }
  }

  // GET /api/ventas/:id/detalles -> las líneas de una venta (para editarla en el historial).
  async listarDetalles(idVenta: number): Promise<{ data: DetalleVenta[]; error: string | null }> {
    try {
      const data = await firstValueFrom(this.http.get<DetalleVenta[]>(`${this.api}/${idVenta}/detalles`));
      return { data, error: null };
    } catch (e) {
      return { data: [], error: mensajeErrorApi(e) };
    }
  }

  // POST /api/ventas -> crea la venta y sus líneas en un solo envío ({ venta, lineas }).
  // La usa la pantalla del cajero al cobrar.
  async crear(venta: VentaInput, lineas: LineaVentaForm[]): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.post(this.api, { venta, lineas }));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }

  // `_estadoAnterior` ya no se envía: el backend lee el estado real desde la base de datos
  // (más seguro). Se conserva el parámetro para no tener que cambiar la página de ventas.
  // (El guion bajo inicial es la convención de "parámetro que no se usa".)
  // PUT /api/ventas/:id -> reemplaza el encabezado y todas las líneas.
  async actualizar(
    id: number,
    venta: VentaInput,
    lineas: LineaVentaForm[],
    _estadoAnterior: EstadoVenta,
  ): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.put(`${this.api}/${id}`, { venta, lineas }));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }

  // DELETE /api/ventas/:id -> elimina la venta y sus líneas.
  async eliminar(id: number): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.delete(`${this.api}/${id}`));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }
}
