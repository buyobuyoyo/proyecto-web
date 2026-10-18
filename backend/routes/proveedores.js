// /api/proveedores -> CRUD de la tabla `proveedor`.
const { pool } = require('../config/db');
const { crearCrud } = require('../utils/crud');

module.exports = crearCrud({
  tabla: 'proveedor',
  columnas: ['nombre', 'contacto'],
  listar: async () => {
    const [filas] = await pool.query('SELECT * FROM proveedor ORDER BY nombre');
    return filas;
  },
});
