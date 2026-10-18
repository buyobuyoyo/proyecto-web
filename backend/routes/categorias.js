// /api/categorias -> CRUD de la tabla `categoria`.
// No hay lógica propia: crearCrud (utils/crud.js) genera GET, POST, PUT y DELETE.
const { pool } = require('../config/db');
const { crearCrud } = require('../utils/crud');

module.exports = crearCrud({
  tabla: 'categoria', // tabla sobre la que opera
  columnas: ['nombre'], // únicas columnas que el cliente puede escribir
  // Consulta que responde a GET /api/categorias: alfabético por nombre.
  listar: async () => {
    const [filas] = await pool.query('SELECT * FROM categoria ORDER BY nombre');
    return filas;
  },
});
