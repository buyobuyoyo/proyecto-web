// /api/categorias -> CRUD de la tabla `categoria`.
const { pool } = require('../config/db');
const { crearCrud } = require('../utils/crud');

module.exports = crearCrud({
  tabla: 'categoria',
  columnas: ['nombre'],
  listar: async () => {
    const [filas] = await pool.query('SELECT * FROM categoria ORDER BY nombre');
    return filas;
  },
});
