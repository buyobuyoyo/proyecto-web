// /api/productos -> CRUD de la tabla `producto`.
// Es el único CRUD simple que personaliza su consulta de lectura (une la categoría).
const { pool } = require('../config/db');
const { crearCrud } = require('../utils/crud');
const { anidar } = require('../utils/datos');

module.exports = crearCrud({
  tabla: 'producto', // tabla sobre la que opera
  // Columnas que el cliente puede escribir. `cantidad` (el stock) NO está: solo cambia con
  // compras, ventas y devoluciones, nunca desde el formulario del producto.
  columnas: ['nombre', 'id_categoria', 'precio', 'codigo_barras', 'tags'],
  listar: async () => {
    // Antes Supabase lo resolvía con select('*, categoria(*)'): cada producto traía
    // su categoría como objeto. Aquí se hace con un LEFT JOIN y se reacomoda.
    // LEFT JOIN (y no INNER) para que un producto sin categoría también aparezca.
    // `nestTables: true` hace que mysql2 separe las columnas por tabla:
    // { producto: {...}, categoria: {...} }.
    const [filas] = await pool.query({
      sql: `SELECT producto.*, categoria.*
            FROM producto
            LEFT JOIN categoria ON categoria.id = producto.id_categoria
            ORDER BY producto.nombre`,
      nestTables: true,
    });
    // `anidar` pasa de { producto, categoria } a { ...producto, categoria } (ver utils/datos.js).
    return anidar(filas, 'producto', 'categoria');
  },
});
