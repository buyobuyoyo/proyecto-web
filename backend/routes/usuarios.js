// Gestión de usuarios (cuentas para iniciar sesión). Solo el administrador llega aquí
// (server.js la monta detrás de verificarToken + permitir(ADMIN)).
//
// Nunca se devuelve ni se acepta `password_hash` desde el cliente: la contraseña llega en
// texto en `password`, se hashea con bcrypt y solo el hash se guarda.
const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { ErrorNegocio } = require('../utils/errores');
const { leerId } = require('../utils/datos');
const { ADMIN, CLIENTE } = require('../middleware/auth');

const router = express.Router();

const RONDAS = 10; // mismo costo de bcrypt que seed.js (más rondas = más lento y más seguro)
const ROLES = [ADMIN, CLIENTE];
const MIN_PASSWORD = 8;

// Valida y limpia los campos de un usuario. Con `parcial` (edición) solo se revisa lo que llegó.
// Devuelve un objeto nuevo solo con los campos permitidos: lo demás que mande el cliente se descarta.
function leerDatos(cuerpo, { parcial }) {
  const datos = {};

  // Al crear (parcial = false) el usuario es obligatorio; al editar solo si vino en la petición.
  if (!parcial || cuerpo?.username !== undefined) {
    const username = String(cuerpo?.username ?? '').trim();
    if (username.length < 3 || username.length > 50) {
      throw new ErrorNegocio('El usuario debe tener entre 3 y 50 caracteres.');
    }
    datos.username = username;
  }

  // El rol solo puede ser uno de la lista: así nadie se asigna un rol inventado.
  if (!parcial || cuerpo?.rol !== undefined) {
    if (!ROLES.includes(cuerpo?.rol)) {
      throw new ErrorNegocio('El rol no es válido.');
    }
    datos.rol = cuerpo.rol;
  }

  // El empleado ligado es opcional; null o '' significan "sin empleado".
  if (cuerpo?.id_empleado !== undefined) {
    const id = cuerpo.id_empleado;
    if (id !== null && id !== '' && !Number.isInteger(Number(id))) {
      throw new ErrorNegocio('El empleado indicado no es válido.');
    }
    datos.id_empleado = id === null || id === '' ? null : Number(id);
  }

  // En edición la contraseña es opcional: si no viene, se conserva la actual.
  const password = cuerpo?.password;
  if (!parcial || (password !== undefined && password !== '')) {
    if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
      throw new ErrorNegocio(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
    }
    datos.password = password;
  }
  return datos;
}

// ¿Cuántos administradores hay? Sirve para no dejar el sistema sin ninguno.
async function contarAdmins() {
  // El doble corchete [[{ total }]] desestructura: primero las filas, luego la primera fila.
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM usuario WHERE rol = ?', [ADMIN]);
  return total;
}

// Busca un usuario por id; si no existe responde 404.
async function buscar(id) {
  const [filas] = await pool.query('SELECT id, rol FROM usuario WHERE id = ?', [id]);
  if (filas.length === 0) throw new ErrorNegocio('El usuario no existe.', 404);
  return filas[0];
}

// GET /api/usuarios -> lista (sin hashes), con el nombre del empleado ligado si lo tiene.
router.get('/', async (req, res) => {
  // LEFT JOIN: el usuario aparece aunque no tenga empleado (en ese caso `empleado` es null).
  const [filas] = await pool.query(
    `SELECT u.id, u.username, u.rol, u.id_empleado, e.nombre AS empleado
       FROM usuario u
       LEFT JOIN empleado e ON e.id = u.id_empleado
      ORDER BY u.username`,
  );
  res.json(filas);
});

// POST /api/usuarios { username, password, rol, id_empleado? }
router.post('/', async (req, res) => {
  // Se separa `password` del resto para no mezclar la contraseña en texto con lo que se guarda.
  const { password, ...datos } = leerDatos(req.body, { parcial: false });
  const hash = await bcrypt.hash(password, RONDAS);
  const [resultado] = await pool.query(
    'INSERT INTO usuario (username, password_hash, rol, id_empleado) VALUES (?, ?, ?, ?)',
    [datos.username, hash, datos.rol, datos.id_empleado ?? null],
  );
  res.status(201).json({ id: resultado.insertId }); // 201 = creado
});

// PUT /api/usuarios/:id { username?, rol?, id_empleado?, password? }
router.put('/:id', async (req, res) => {
  const id = leerId(req.params.id);
  const actual = await buscar(id);
  const { password, ...datos } = leerDatos(req.body, { parcial: true });

  // No quitarle el rol de administrador al último que queda.
  if (actual.rol === ADMIN && datos.rol && datos.rol !== ADMIN && (await contarAdmins()) <= 1) {
    throw new ErrorNegocio('Debe quedar al menos un administrador.', 409);
  }

  // Solo se actualizan las columnas que llegaron; la contraseña, si viene, se guarda hasheada.
  const cambios = { ...datos };
  if (password) cambios.password_hash = await bcrypt.hash(password, RONDAS);
  const columnas = Object.keys(cambios);
  if (columnas.length === 0) throw new ErrorNegocio('No hay cambios que guardar.');

  // Los nombres de columna salen de leerDatos (lista fija), nunca del cliente.
  // Se arma "col1 = ?, col2 = ?" y los valores van aparte, en el mismo orden.
  await pool.query(`UPDATE usuario SET ${columnas.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [
    ...columnas.map((c) => cambios[c]),
    id,
  ]);
  res.json({ ok: true });
});

// DELETE /api/usuarios/:id
router.delete('/:id', async (req, res) => {
  const id = leerId(req.params.id);
  // `req.usuario` lo dejó verificarToken: es quien está haciendo la petición.
  if (id === req.usuario.id) {
    throw new ErrorNegocio('No puedes eliminar tu propia cuenta.', 409);
  }
  const actual = await buscar(id);
  if (actual.rol === ADMIN && (await contarAdmins()) <= 1) {
    throw new ErrorNegocio('Debe quedar al menos un administrador.', 409);
  }
  await pool.query('DELETE FROM usuario WHERE id = ?', [id]);
  res.json({ ok: true });
});

module.exports = router;
