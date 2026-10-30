import { Rol } from '../servicios/auth.service';

// Un usuario tal como lo devuelve GET /api/usuarios (nunca incluye la contraseña ni su hash).
export interface Usuario {
  id: number;
  username: string;
  rol: Rol;
  id_empleado: number | null;
  // Nombre del empleado ligado (o null si no tiene).
  empleado: string | null;
}

// Lo que se envía al crear o editar. `password` es obligatoria al crear; al editar,
// si se deja vacía se conserva la contraseña actual.
export interface UsuarioInput {
  username: string;
  rol: Rol;
  id_empleado: number | null;
  password: string;
}
