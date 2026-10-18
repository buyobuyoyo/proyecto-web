// Los "modelos" son interfaces de TypeScript: describen la FORMA de los datos que viajan entre
// el backend y la interfaz. No generan código en el navegador; solo permiten que el editor
// y el compilador avisen si usas un campo que no existe o con el tipo equivocado.

// Una categoría tal como la devuelve el API (tabla `categoria`).
export interface Categoria {
  id: number;
  nombre: string;
}

// Lo que se envía al CREAR/EDITAR: la misma forma pero sin `id`, porque lo asigna MySQL.
// `Omit<T, 'campo'>` es "el tipo T quitándole ese campo".
export type CategoriaInput = Omit<Categoria, 'id'>;
