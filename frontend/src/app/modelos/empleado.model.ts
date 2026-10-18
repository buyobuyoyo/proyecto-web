// Un empleado tal como lo devuelve el API (tabla `empleado`).
export interface Empleado {
  id: number;
  nombre: string;
  cargo: string;
  // Solo admite estos dos valores (igual que el CHECK de la base de datos).
  estado: 'activo' | 'baja';
  // Ruta de la imagen; `null` si no tiene (la interfaz entonces usa el logo).
  foto: string | null;
  rendimiento: number; // porcentaje, por ejemplo 85.5
  fecha_alta: string; // formato 'YYYY-MM-DD'
}

// Forma sin `id`, por si en el futuro se permite crear/editar empleados.
export type EmpleadoInput = Omit<Empleado, 'id'>;
