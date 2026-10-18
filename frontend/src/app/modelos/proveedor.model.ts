// Un proveedor tal como lo devuelve el API (tabla `proveedor`).
export interface Proveedor {
  id: number;
  nombre: string;
  contacto: string | null; // teléfono o correo; opcional
}

// Lo que se envía al crear/editar: sin `id`.
export type ProveedorInput = Omit<Proveedor, 'id'>;
