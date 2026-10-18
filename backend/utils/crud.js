// Fábrica de rutas CRUD sencillas (listar, crear, actualizar, eliminar) para una tabla.
// Se usa en las tablas que no necesitan lógica especial: categoria, proveedor, finanza, producto.
const express = require('express');
const { pool } = require('../config/db');
const { ErrorNegocio } = require('./errores');
const { soloColumnas } = require('./datos');

// tabla:    nombre de la tabla (siempre una constante nuestra, nunca viene del cliente)
// columnas: columnas que se permiten escribir (el `id` nunca se escribe)
// listar:   función que devuelve las filas para GET /
function crearCrud({ tabla, columnas, listar }) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    res.json(await listar());
  });

  router.post('/', async (req, res) => {
    const datos = soloColumnas(req.body, columnas);
    if (Object.keys(datos).length === 0) {
      throw new ErrorNegocio('Faltan campos obligatorios.');
    }
    // `SET ?` convierte el objeto en `columna = valor, ...` con los valores escapados.
    const [resultado] = await pool.query(`INSERT INTO ${tabla} SET ?`, [datos]);
    res.status(201).json({ id: resultado.insertId });
  });

  router.put('/:id', async (req, res) => {
    const datos = soloColumnas(req.body, columnas);
    if (Object.keys(datos).length === 0) {
      throw new ErrorNegocio('No hay datos para actualizar.');
    }
    const [resultado] = await pool.query(`UPDATE ${tabla} SET ? WHERE id = ?`, [datos, req.params.id]);
    if (resultado.affectedRows === 0) {
      throw new ErrorNegocio('Registro no encontrado.', 404);
    }
    res.json({ ok: true });
  });

  router.delete('/:id', async (req, res) => {
    const [resultado] = await pool.query(`DELETE FROM ${tabla} WHERE id = ?`, [req.params.id]);
    if (resultado.affectedRows === 0) {
      throw new ErrorNegocio('Registro no encontrado.', 404);
    }
    res.json({ ok: true });
  });

  return router;
}

module.exports = { crearCrud };
