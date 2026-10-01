import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Categoria, CategoriaInput } from '../modelos/categoria.model';
import { mensajeErrorDb } from '../utilidades/supabase-errores';

@Injectable({
  providedIn: 'root',
})
export class CategoriaService {
  private supabase = inject(SupabaseService);

  async listar(): Promise<{ data: Categoria[]; error: string | null }> {
    const { data, error } = await this.supabase.client
      .from('categoria')
      .select('*')
      .order('nombre');

    if (error) {
      return { data: [], error: mensajeErrorDb(error) };
    }
    return { data: data as Categoria[], error: null };
  }

  async crear(datos: CategoriaInput): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.from('categoria').insert(datos);
    return { error: error ? mensajeErrorDb(error) : null };
  }

  async actualizar(id: number, datos: CategoriaInput): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.from('categoria').update(datos).eq('id', id);
    return { error: error ? mensajeErrorDb(error) : null };
  }

  async eliminar(id: number): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.from('categoria').delete().eq('id', id);
    return { error: error ? mensajeErrorDb(error) : null };
  }
}
