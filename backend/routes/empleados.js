// /api/empleados -> SOLO CONSULTA.
// El módulo de RH se acordó como de consulta (listar y ver), así que a propósito
// no existen rutas para crear, editar ni eliminar empleados.
const express = require('express');
const { pool } = require('../config/db');

const router = express.Router();

// Solo existe GET: no hay POST/PUT/DELETE a propósito (ver el comentario de arriba).
router.get('/', async (req, res) => {
  const [filas] = await pool.query('SELECT * FROM empleado ORDER BY nombre');
  res.json(filas);
});

module.exports = router;
