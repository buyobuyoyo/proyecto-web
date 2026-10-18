// Fábrica de rutas CRUD sencillas (listar, crear, actualizar, eliminar) para una tabla.
// Se usa en las tablas que no necesitan lógica especial: categoria, proveedor, finanza, producto.
//
// CRUD = Create, Read, Update, Delete. Estas cuatro operaciones se repetirían idénticas en
// cada tabla, así que en lugar de copiar el código se escribe una sola vez aquí y cada
// archivo de routes/ solo dice "qué tabla" y "qué columnas".
const express = require('express');
const { pool } = require('../config/db');
const { ErrorNegocio } = require('./errores');
const { soloColumnas } = require('./datos');

// tabla:    nombre de la tabla (siempre una constante nuestra, nunca viene del cliente)
// columnas: columnas que se permiten escribir (el `id` nunca se escribe)
// listar:   función que devuelve las filas para GET /
function crearCrud({ tabla, columnas, listar }) {
  // Un Router es un "mini-app" de Express: agrupa rutas que luego server.js monta bajo un prefijo.
  const router = express.Router();

  // GET /  -> devuelve la lista. Cada tabla define su propia consulta en `listar`
  // (por ejemplo, productos necesita unir su categoría).
  router.get('/', async (req, res) => {
    res.json(await listar());
  });

  // POST /  -> crea un registro con lo que venga en el cuerpo (req.body).
  router.post('/', async (req, res) => {
    // Se descartan los campos que no estén en la lista permitida.
    const datos = soloColumnas(req.body, columnas);
    if (Object.keys(datos).length === 0) {
      throw new ErrorNegocio('Faltan campos obligatorios.');
    }
    // `SET ?` convierte el objeto en `columna = valor, ...` con los valores escapados.
    // Los valores nunca se pegan al texto del SQL, así se evita la inyección SQL.
    const [resultado] = await pool.query(`INSERT INTO ${tabla} SET ?`, [datos]);
    // 201 = "creado". `insertId` es el id que MySQL asignó al nuevo registro.
    res.status(201).json({ id: resultado.insertId });
  });

  // PUT /:id  -> actualiza el registro con ese id. `:id` se lee en req.params.id.
  router.put('/:id', async (req, res) => {
    const datos = soloColumnas(req.body, columnas);
    if (Object.keys(datos).length === 0) {
      throw new ErrorNegocio('No hay datos para actualizar.');
    }
    const [resultado] = await pool.query(`UPDATE ${tabla} SET ? WHERE id = ?`, [datos, req.params.id]);
    // `affectedRows` = cuántas filas se modificaron; 0 significa que ese id no existe.
    if (resultado.affectedRows === 0) {
      throw new ErrorNegocio('Registro no encontrado.', 404);
    }
    res.json({ ok: true });
  });

  // DELETE /:id  -> elimina el registro. Si otra tabla depende de él, MySQL rechaza el
  // borrado y errores.js lo traduce a un mensaje claro.
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
