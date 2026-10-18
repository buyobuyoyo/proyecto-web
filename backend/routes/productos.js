// /api/productos -> CRUD de la tabla `producto`.
const { pool } = require('../config/db');
const { crearCrud } = require('../utils/crud');
const { anidar } = require('../utils/datos');

module.exports = crearCrud({
  tabla: 'producto',
  columnas: ['nombre', 'id_categoria', 'cantidad', 'precio', 'codigo_barras', 'tags'],
  listar: async () => {
    // Antes Supabase lo resolvía con select('*, categoria(*)'): cada producto traía
    // su categoría como objeto. Aquí se hace con un LEFT JOIN y se reacomoda.
    const [filas] = await pool.query({
      sql: `SELECT producto.*, categoria.*
            FROM producto
            LEFT JOIN categoria ON categoria.id = producto.id_categoria
            ORDER BY producto.nombre`,
      nestTables: true,
    });
    return anidar(filas, 'producto', 'categoria');
  },
});
