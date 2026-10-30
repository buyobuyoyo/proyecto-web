// Inicio de sesión. Es la única ruta del API (junto con el 404) que no pide token.
const express = require('express');
const bcrypt = require('bcrypt'); // hashing de contraseñas: nunca se guardan en texto plano
const { pool } = require('../config/db');
const { ErrorNegocio } = require('../utils/errores');
const { firmarToken, verificarToken } = require('../middleware/auth');

const router = express.Router();

// Hash de relleno: si el usuario no existe igual se compara contra este, para que la
// respuesta tarde lo mismo y no se pueda averiguar qué usuarios existen midiendo el tiempo.
// (bcrypt es lento a propósito; saltarse la comparación delataría al usuario inexistente.)
const HASH_FALSO = bcrypt.hashSync('relleno-sin-uso', 10);

// POST /api/auth/login  { username, password } -> { token, usuario }
router.post('/login', async (req, res) => {
  // `?.` y `?? ''` evitan errores si el cuerpo viene vacío; String() asegura que sean texto.
  const username = String(req.body?.username ?? '').trim();
  const password = String(req.body?.password ?? '');
  if (!username || !password) {
    throw new ErrorNegocio('Escribe tu usuario y contraseña.');
  }

  // La consulta usa `?` con un arreglo de valores (consulta parametrizada): evita inyección SQL.
  const [filas] = await pool.query(
    'SELECT id, username, password_hash, rol FROM usuario WHERE username = ?',
    [username],
  );
  const usuario = filas[0];
  // compare() hashea lo escrito y lo compara con el hash guardado; nunca se "descifra" nada.
  const coincide = await bcrypt.compare(password, usuario ? usuario.password_hash : HASH_FALSO);

  // Mismo mensaje si falla el usuario o la contraseña.
  if (!usuario || !coincide) {
    throw new ErrorNegocio('Usuario o contraseña incorrectos.', 401);
  }

  // Se responde con el token y los datos públicos; el hash de la contraseña no sale del servidor.
  res.json({
    token: firmarToken(usuario),
    usuario: { id: usuario.id, username: usuario.username, rol: usuario.rol },
  });
});

// GET /api/auth/yo -> el usuario de la sesión actual (el frontend lo usa para validar un token guardado).
router.get('/yo', verificarToken, (req, res) => {
  res.json(req.usuario);
});

module.exports = router;
