// Crea los usuarios iniciales para poder iniciar sesión. Se corre a mano: `npm run seed`.
//
// - Las credenciales se leen de backend/.env (ADMIN_EMAIL, ADMIN_PASSWORD, CLIENTE_EMAIL,
//   CLIENTE_PASSWORD); no hay ninguna escrita aquí.
// - Es idempotente: si el usuario ya existe no se toca (ni se duplica ni se le cambia la
//   contraseña). Solo hace INSERT; no borra ni modifica nada más.
require('dotenv').config(); // carga .env en process.env antes de leer las variables de abajo
const bcrypt = require('bcrypt');
const { pool } = require('./config/db');
const { ADMIN, CLIENTE } = require('./middleware/auth');

// Mismo costo que usa el resto del backend al hashear contraseñas.
const RONDAS = 10;

// Los dos usuarios a crear. `obligatorio` indica si su ausencia en .env se considera un error:
// sin administrador no se puede entrar al sistema; el cliente de prueba es opcional.
const usuarios = [
  { rol: ADMIN, username: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, obligatorio: true },
  { rol: CLIENTE, username: process.env.CLIENTE_EMAIL, password: process.env.CLIENTE_PASSWORD, obligatorio: false },
];

// Idempotencia: primero se busca; solo si no existe se inserta (correrlo dos veces no duplica).
async function crearSiNoExiste({ rol, username, password }) {
  const [existe] = await pool.query('SELECT id FROM usuario WHERE username = ?', [username]);
  if (existe.length > 0) {
    console.log(`- ${rol}: "${username}" ya existe, no se modifica.`);
    return;
  }
  // En la base solo se guarda el hash bcrypt, nunca la contraseña original.
  const hash = await bcrypt.hash(password, RONDAS);
  await pool.query('INSERT INTO usuario (username, password_hash, rol) VALUES (?, ?, ?)', [username, hash, rol]);
  console.log(`- ${rol}: "${username}" creado.`);
}

async function main() {
  let faltaAlgo = false;
  for (const usuario of usuarios) {
    // Si faltan las variables de ese usuario se omite; solo cuenta como fallo si era obligatorio.
    if (!usuario.username || !usuario.password) {
      console.log(`- ${usuario.rol}: faltan sus variables en .env, se omite.`);
      faltaAlgo = faltaAlgo || usuario.obligatorio;
      continue;
    }
    if (usuario.username.length > 50) {
      throw new Error(`El usuario "${usuario.username}" excede los 50 caracteres de usuario.username.`);
    }
    await crearSiNoExiste(usuario);
  }
  if (faltaAlgo) {
    // exitCode distinto de 0 avisa al terminal/scripts que el seed no terminó bien.
    process.exitCode = 1;
    console.error('Define ADMIN_EMAIL y ADMIN_PASSWORD en backend/.env (mira .env.example).');
  }
}

main()
  .catch((error) => {
    console.error('El seed falló:', error.message);
    process.exitCode = 1;
  })
  // Se cierra el pool de conexiones siempre; si no, Node no terminaría el proceso.
  .finally(() => pool.end());
