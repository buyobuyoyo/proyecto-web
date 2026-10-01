import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { FinanzaService } from './finanza.service';
import { Compra, CompraInput, EstadoCompra } from '../modelos/compra.model';
import { DetalleCompra, LineaCompraForm } from '../modelos/detalle-compra.model';
import { mensajeErrorDb } from '../utilidades/supabase-errores';

@Injectable({
  providedIn: 'root',
})
export class CompraService {
  private supabase = inject(SupabaseService);
  private finanzaService = inject(FinanzaService);

  async listar(): Promise<{ data: Compra[]; error: string | null }> {
    const { data, error } = await this.supabase.client
      .from('compra')
      .select('*, proveedor(*)')
      .order('fecha', { ascending: false });

    if (error) {
      return { data: [], error: mensajeErrorDb(error) };
    }
    return { data: data as unknown as Compra[], error: null };
  }

  async listarDetalles(idCompra: number): Promise<{ data: DetalleCompra[]; error: string | null }> {
    const { data, error } = await this.supabase.client
      .from('detalle_compra')
      .select('*, producto(*)')
      .eq('id_compra', idCompra);

    if (error) {
      return { data: [], error: mensajeErrorDb(error) };
    }
    return { data: data as unknown as DetalleCompra[], error: null };
  }

  async crear(compra: CompraInput, lineas: LineaCompraForm[]): Promise<{ error: string | null }> {
    const { data: nuevaCompra, error: errorCompra } = await this.supabase.client
      .from('compra')
      .insert(compra)
      .select('id')
      .single();

    if (errorCompra || !nuevaCompra) {
      return { error: errorCompra ? mensajeErrorDb(errorCompra) : 'No se pudo crear la compra.' };
    }

    const errorLineas = await this.guardarLineas(nuevaCompra.id, lineas);
    if (errorLineas) {
      // Best-effort: no dejar un encabezado de compra huérfano sin líneas.
      await this.supabase.client.from('compra').delete().eq('id', nuevaCompra.id);
      return { error: errorLineas };
    }

    if (compra.estado === 'recibida') {
      const errorStock = await this.aplicarEntradaStock(lineas);
      if (errorStock) return { error: errorStock };
      await this.registrarGasto(compra, nuevaCompra.id);
    }

    return { error: null };
  }

  async actualizar(
    id: number,
    compra: CompraInput,
    lineas: LineaCompraForm[],
    estadoAnterior: EstadoCompra,
  ): Promise<{ error: string | null }> {
    const { error: errorCompra } = await this.supabase.client
      .from('compra')
      .update(compra)
      .eq('id', id);

    if (errorCompra) {
      return { error: mensajeErrorDb(errorCompra) };
    }

    // Reemplaza las líneas existentes por las del formulario (más simple que diffear).
    const { error: errorBorrar } = await this.supabase.client
      .from('detalle_compra')
      .delete()
      .eq('id_compra', id);

    if (errorBorrar) {
      return { error: mensajeErrorDb(errorBorrar) };
    }

    const errorLineas = await this.guardarLineas(id, lineas);
    if (errorLineas) return { error: errorLineas };

    if (compra.estado === 'recibida' && estadoAnterior !== 'recibida') {
      const errorStock = await this.aplicarEntradaStock(lineas);
      if (errorStock) return { error: errorStock };
      await this.registrarGasto(compra, id);
    }

    return { error: null };
  }

  async eliminar(id: number): Promise<{ error: string | null }> {
    const { error: errorDetalles } = await this.supabase.client
      .from('detalle_compra')
      .delete()
      .eq('id_compra', id);

    if (errorDetalles) {
      return { error: mensajeErrorDb(errorDetalles) };
    }

    const { error } = await this.supabase.client.from('compra').delete().eq('id', id);
    return { error: error ? mensajeErrorDb(error) : null };
  }

  /**
   * Registra el gasto en `finanza` al recibir una compra. Es best-effort:
   * si falla, no revierte la compra (ya guardada) ni el stock (ya sumado).
   */
  private async registrarGasto(compra: CompraInput, idCompra: number): Promise<void> {
    const { error } = await this.finanzaService.crear({
      fecha: compra.fecha,
      tipo: 'gasto_insumo',
      monto: compra.total,
      origen: `Compra #${idCompra}`,
    });
    if (error) {
      console.error('No se pudo registrar el gasto en finanzas:', error);
    }
  }

  private async guardarLineas(idCompra: number, lineas: LineaCompraForm[]): Promise<string | null> {
    const filas = lineas.map((l) => ({
      id_compra: idCompra,
      id_producto: l.id_producto,
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
    }));

    const { error } = await this.supabase.client.from('detalle_compra').insert(filas);
    return error ? mensajeErrorDb(error) : null;
  }

  /** Suma la cantidad comprada de cada línea al stock del producto correspondiente. */
  private async aplicarEntradaStock(lineas: LineaCompraForm[]): Promise<string | null> {
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
        .update({ cantidad: producto.cantidad + linea.cantidad })
        .eq('id', linea.id_producto);

      if (errorEscritura) {
        return mensajeErrorDb(errorEscritura);
      }
    }

    return null;
  }
}
