export interface Proveedor {
  id: number;
  nombre: string;
  contacto: string | null;
}

export type ProveedorInput = Omit<Proveedor, 'id'>;
