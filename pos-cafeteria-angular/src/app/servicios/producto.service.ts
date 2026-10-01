import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Producto, ProductoInput } from '../modelos/producto.model';
import { mensajeErrorDb } from '../utilidades/supabase-errores';

@Injectable({
  providedIn: 'root',
})
export class ProductoService {
  private supabase = inject(SupabaseService);

  async listar(): Promise<{ data: Producto[]; error: string | null }> {
    const { data, error } = await this.supabase.client
      .from('producto')
      .select('*, categoria(*)')
      .order('nombre');

    if (error) {
      return { data: [], error: mensajeErrorDb(error) };
    }
    return { data: data as unknown as Producto[], error: null };
  }

  async crear(datos: ProductoInput): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.from('producto').insert(datos);
    return { error: error ? mensajeErrorDb(error) : null };
  }

  async actualizar(id: number, datos: ProductoInput): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.from('producto').update(datos).eq('id', id);
    return { error: error ? mensajeErrorDb(error) : null };
  }

  async eliminar(id: number): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.from('producto').delete().eq('id', id);
    return { error: error ? mensajeErrorDb(error) : null };
  }
}
