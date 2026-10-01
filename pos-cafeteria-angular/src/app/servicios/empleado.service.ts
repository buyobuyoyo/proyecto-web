import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Empleado, EmpleadoInput } from '../modelos/empleado.model';
import { mensajeErrorDb } from '../utilidades/supabase-errores';

@Injectable({
  providedIn: 'root',
})
export class EmpleadoService {
  private supabase = inject(SupabaseService);

  async listar(): Promise<{ data: Empleado[]; error: string | null }> {
    const { data, error } = await this.supabase.client
      .from('empleado')
      .select('*')
      .order('nombre');

    if (error) {
      return { data: [], error: mensajeErrorDb(error) };
    }
    return { data: data as Empleado[], error: null };
  }

  async crear(datos: EmpleadoInput): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.from('empleado').insert(datos);
    return { error: error ? mensajeErrorDb(error) : null };
  }

  async actualizar(id: number, datos: EmpleadoInput): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.from('empleado').update(datos).eq('id', id);
    return { error: error ? mensajeErrorDb(error) : null };
  }

  async eliminar(id: number): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.from('empleado').delete().eq('id', id);
    return { error: error ? mensajeErrorDb(error) : null };
  }
}
