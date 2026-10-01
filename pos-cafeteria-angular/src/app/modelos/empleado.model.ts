export interface Empleado {
  id: number;
  nombre: string;
  cargo: string;
  estado: 'activo' | 'baja';
  foto: string | null;
  rendimiento: number;
  fecha_alta: string; // formato 'YYYY-MM-DD'
}

export type EmpleadoInput = Omit<Empleado, 'id'>;
