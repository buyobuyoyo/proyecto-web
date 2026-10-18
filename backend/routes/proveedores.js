// /api/proveedores -> CRUD de la tabla `proveedor`.
// Igual que categorías: todo el CRUD lo genera crearCrud (utils/crud.js).
const { pool } = require('../config/db');
const { crearCrud } = require('../utils/crud');

module.exports = crearCrud({
  tabla: 'proveedor', // tabla sobre la que opera
  columnas: ['nombre', 'contacto'], // únicas columnas que el cliente puede escribir
  // Consulta que responde a GET /api/proveedores: alfabético por nombre.
  listar: async () => {
    const [filas] = await pool.query('SELECT * FROM proveedor ORDER BY nombre');
    return filas;
  },
});
