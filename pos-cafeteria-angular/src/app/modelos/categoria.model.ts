export interface Categoria {
  id: number;
  nombre: string;
}

export type CategoriaInput = Omit<Categoria, 'id'>;
