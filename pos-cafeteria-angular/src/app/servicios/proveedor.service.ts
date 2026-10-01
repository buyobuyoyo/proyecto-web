import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Proveedor, ProveedorInput } from '../modelos/proveedor.model';
import { mensajeErrorDb } from '../utilidades/supabase-errores';

@Injectable({
  providedIn: 'root',
})
export class ProveedorService {
  private supabase = inject(SupabaseService);

  async listar(): Promise<{ data: Proveedor[]; error: string | null }> {
    const { data, error } = await this.supabase.client
      .from('proveedor')
      .select('*')
      .order('nombre');

    if (error) {
      return { data: [], error: mensajeErrorDb(error) };
    }
    return { data: data as Proveedor[], error: null };
  }

  async crear(datos: ProveedorInput): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.from('proveedor').insert(datos);
    return { error: error ? mensajeErrorDb(error) : null };
  }

  async actualizar(id: number, datos: ProveedorInput): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.from('proveedor').update(datos).eq('id', id);
    return { error: error ? mensajeErrorDb(error) : null };
  }

  async eliminar(id: number): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.from('proveedor').delete().eq('id', id);
    return { error: error ? mensajeErrorDb(error) : null };
  }
}
