import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { FinanzaService } from './finanza.service';
import { Venta, VentaInput, EstadoVenta } from '../modelos/venta.model';
import { DetalleVenta, LineaVentaForm } from '../modelos/detalle-venta.model';
import { mensajeErrorDb } from '../utilidades/supabase-errores';

@Injectable({
  providedIn: 'root',
})
export class VentaService {
  private supabase = inject(SupabaseService);
  private finanzaService = inject(FinanzaService);

  async listar(): Promise<{ data: Venta[]; error: string | null }> {
    const { data, error } = await this.supabase.client
      .from('venta')
      .select('*, empleado(*)')
      .order('fecha', { ascending: false });

    if (error) {
      return { data: [], error: mensajeErrorDb(error) };
    }
    return { data: data as unknown as Venta[], error: null };
  }

  async listarDetalles(idVenta: number): Promise<{ data: DetalleVenta[]; error: string | null }> {
    const { data, error } = await this.supabase.client
      .from('detalle_venta')
      .select('*, producto(*)')
      .eq('id_venta', idVenta);

    if (error) {
      return { data: [], error: mensajeErrorDb(error) };
    }
    return { data: data as unknown as DetalleVenta[], error: null };
  }

  async crear(venta: VentaInput, lineas: LineaVentaForm[]): Promise<{ error: string | null }> {
    const { data: nuevaVenta, error: errorVenta } = await this.supabase.client
      .from('venta')
      .insert(venta)
      .select('id')
      .single();

    if (errorVenta || !nuevaVenta) {
      return { error: errorVenta ? mensajeErrorDb(errorVenta) : 'No se pudo crear la venta.' };
    }

    const errorLineas = await this.guardarLineas(nuevaVenta.id, lineas);
    if (errorLineas) {
      // Best-effort: no dejar un encabezado de venta huérfano sin líneas.
      await this.supabase.client.from('venta').delete().eq('id', nuevaVenta.id);
      return { error: errorLineas };
    }

    if (venta.estado === 'confirmada') {
      const errorStock = await this.descontarStock(lineas);
      if (errorStock) return { error: errorStock };
      await this.registrarIngreso(venta, nuevaVenta.id);
    }

    return { error: null };
  }

  async actualizar(
    id: number,
    venta: VentaInput,
    lineas: LineaVentaForm[],
    estadoAnterior: EstadoVenta,
  ): Promise<{ error: string | null }> {
    const { error: errorVenta } = await this.supabase.client
      .from('venta')
      .update(venta)
      .eq('id', id);

    if (errorVenta) {
      return { error: mensajeErrorDb(errorVenta) };
    }

    // Reemplaza las líneas existentes por las del formulario (más simple que diffear).
    const { error: errorBorrar } = await this.supabase.client
      .from('detalle_venta')
      .delete()
      .eq('id_venta', id);

    if (errorBorrar) {
      return { error: mensajeErrorDb(errorBorrar) };
    }

    const errorLineas = await this.guardarLineas(id, lineas);
    if (errorLineas) return { error: errorLineas };

    if (venta.estado === 'confirmada' && estadoAnterior !== 'confirmada') {
      const errorStock = await this.descontarStock(lineas);
      if (errorStock) return { error: errorStock };
      await this.registrarIngreso(venta, id);
    }

    return { error: null };
  }

  async eliminar(id: number): Promise<{ error: string | null }> {
    const { error: errorDetalles } = await this.supabase.client
      .from('detalle_venta')
      .delete()
      .eq('id_venta', id);

    if (errorDetalles) {
      return { error: mensajeErrorDb(errorDetalles) };
    }

    const { error } = await this.supabase.client.from('venta').delete().eq('id', id);
    return { error: error ? mensajeErrorDb(error) : null };
  }

  /**
   * Registra el ingreso en `finanza` al confirmar una venta. Es best-effort:
   * si falla, no revierte la venta (ya guardada) ni el stock (ya descontado).
   */
  private async registrarIngreso(venta: VentaInput, idVenta: number): Promise<void> {
    const { error } = await this.finanzaService.crear({
      fecha: venta.fecha.slice(0, 10),
      tipo: 'ingreso_venta',
      monto: venta.total,
      origen: `Venta #${idVenta}`,
    });
    if (error) {
      console.error('No se pudo registrar el ingreso en finanzas:', error);
    }
  }

  private async guardarLineas(idVenta: number, lineas: LineaVentaForm[]): Promise<string | null> {
    const filas = lineas.map((l) => ({
      id_venta: idVenta,
      id_producto: l.id_producto,
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
    }));

    const { error } = await this.supabase.client.from('detalle_venta').insert(filas);
    return error ? mensajeErrorDb(error) : null;
  }

  /** Resta la cantidad vendida de cada línea al stock del producto correspondiente. */
  private async descontarStock(lineas: LineaVentaForm[]): Promise<string | null> {
    for (const linea of lineas) {
      if (!linea.id_producto) continue;

      const { data: producto, error: errorLectura } = await this.supabase.client
        .from('producto')
        .select('cantidad')
        .eq('id', linea.id_producto)
        .single();

      if (errorLectura || !producto) {
        return errorLectura
          ? mensajeErrorDb(errorLectura)
          : 'No se pudo actualizar el stock: producto no encontrado.';
      }

      const { error: errorEscritura } = await this.supabase.client
        .from('producto')
        .update({ cantidad: producto.cantidad - linea.cantidad })
        .eq('id', linea.id_producto);

      if (errorEscritura) {
        return mensajeErrorDb(errorEscritura);
      }
    }

    return null;
  }
}
