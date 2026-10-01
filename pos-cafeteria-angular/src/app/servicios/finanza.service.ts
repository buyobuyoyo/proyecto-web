import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Finanza, FinanzaInput } from '../modelos/finanza.model';
import { mensajeErrorDb } from '../utilidades/supabase-errores';

@Injectable({
  providedIn: 'root',
})
export class FinanzaService {
  private supabase = inject(SupabaseService);

  async listar(): Promise<{ data: Finanza[]; error: string | null }> {
    const { data, error } = await this.supabase.client
      .from('finanza')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) {
      return { data: [], error: mensajeErrorDb(error) };
    }
    return { data: data as Finanza[], error: null };
  }

  async crear(datos: FinanzaInput): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.from('finanza').insert(datos);
    return { error: error ? mensajeErrorDb(error) : null };
  }

  async actualizar(id: number, datos: FinanzaInput): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.from('finanza').update(datos).eq('id', id);
    return { error: error ? mensajeErrorDb(error) : null };
  }

  async eliminar(id: number): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.from('finanza').delete().eq('id', id);
    return { error: error ? mensajeErrorDb(error) : null };
  }
}
