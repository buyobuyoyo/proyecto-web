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
 */
@Injectable({
  providedIn: 'root',
})
export class VentaService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/ventas`;

  async listar(): Promise<{ data: Venta[]; error: string | null }> {
    try {
      const data = await firstValueFrom(this.http.get<Venta[]>(this.api));
      return { data, error: null };
    } catch (e) {
      return { data: [], error: mensajeErrorApi(e) };
    }
  }

  async listarDetalles(idVenta: number): Promise<{ data: DetalleVenta[]; error: string | null }> {
    try {
      const data = await firstValueFrom(this.http.get<DetalleVenta[]>(`${this.api}/${idVenta}/detalles`));
      return { data, error: null };
    } catch (e) {
      return { data: [], error: mensajeErrorApi(e) };
    }
  }

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

  async eliminar(id: number): Promise<{ error: string | null }> {
    try {
      await firstValueFrom(this.http.delete(`${this.api}/${id}`));
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }
}
