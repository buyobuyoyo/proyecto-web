// Autenticación (¿quién eres?) y autorización (¿qué puedes hacer?) para el API.
//
// Una petición protegida pasa por dos filtros antes de llegar a su ruta:
//   petición -> verificarToken -> permitir(...roles) -> ruta
//
// Un "middleware" de Express es una función (req, res, next) que se ejecuta ANTES de la ruta:
// puede cortar la petición lanzando un error o dejarla seguir llamando a next().
const jwt = require('jsonwebtoken'); // JWT: token firmado que prueba que el login fue válido
const { pool } = require('../config/db');
const { ErrorNegocio } = require('../utils/errores');

// Roles que existen en la tabla `usuario`.
const ADMIN = 'administrador';
const CLIENTE = 'cliente';

// Lee y valida el secreto. Si falta, se detiene con un mensaje claro en vez de firmar
// tokens con un secreto vacío (cualquiera podría falsificarlos).
// El secreto vive en .env (JWT_SECRET), nunca en el código ni en git.
function secretoJwt() {
  const secreto = process.env.JWT_SECRET;
  if (!secreto || secreto.length < 16) {
    throw new Error('Falta JWT_SECRET en backend/.env (mínimo 16 caracteres). Mira .env.example.');
  }
  return secreto;
}

// Crea el token que se entrega al iniciar sesión. Solo lleva el id: el rol se vuelve a
// leer de la base en cada petición, así un cambio de rol o un usuario borrado se nota al instante.
function firmarToken(usuario) {
  // `sub` ("subject") es el campo estándar de JWT para el dueño del token.
  // HS256 = firma con clave compartida (el secreto); `expiresIn` hace que el token caduque.
  return jwt.sign({ sub: usuario.id }, secretoJwt(), {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES || '8h',
  });
}

// Exige el encabezado `Authorization: Bearer <token>`, comprueba la firma y que el usuario
// siga existiendo; deja `req.usuario = { id, username, rol }` para los pasos siguientes.
async function verificarToken(req, res, next) {
  // El encabezado llega como "Bearer abc123": se parte en el tipo y el token.
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) {
    // 401 = "no autenticado": falta sesión.
    throw new ErrorNegocio('Debes iniciar sesión.', 401);
  }

  let datos;
  try {
    // verify() comprueba la firma y la caducidad; si algo falla, lanza un error.
    // Se fija el algoritmo permitido para que nadie pueda mandar un token "sin firma".
    datos = jwt.verify(token, secretoJwt(), { algorithms: ['HS256'] });
  } catch (error) {
    // Token vencido, alterado o mal formado. (Si falta JWT_SECRET, ese error sí se propaga.)
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new ErrorNegocio('Tu sesión expiró. Inicia sesión de nuevo.', 401);
    }
    throw error;
  }

  // Se consulta la base en cada petición: así el rol siempre es el actual, no el del login.
  const [filas] = await pool.query('SELECT id, username, rol FROM usuario WHERE id = ?', [datos.sub]);
  if (filas.length === 0) {
    throw new ErrorNegocio('Tu sesión expiró. Inicia sesión de nuevo.', 401);
  }
  req.usuario = filas[0]; // las rutas siguientes leen quién es el usuario desde aquí
  next(); // pasa al siguiente middleware o a la ruta
}

// Deja pasar solo a los roles indicados. Va siempre después de verificarToken.
// Es una "fábrica": permitir(ADMIN) devuelve el middleware ya configurado con esos roles.
function permitir(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario?.rol)) {
      // 403 = "prohibido": hay sesión, pero su rol no alcanza (distinto de 401).
      throw new ErrorNegocio('No tienes permiso para esta acción.', 403);
    }
    next();
  };
}

// Variante por método HTTP: { GET: [roles], POST: [roles], '*': [roles] }.
// Sirve para recursos que el cliente puede consultar pero solo el administrador modifica.
function permitirPorMetodo(reglas) {
  return (req, res, next) => {
    // Si el método (GET, POST...) no tiene regla propia se usa '*'; sin '*', solo el admin.
    const roles = reglas[req.method] || reglas['*'] || [ADMIN];
    return permitir(...roles)(req, res, next);
  };
}

module.exports = { ADMIN, CLIENTE, secretoJwt, firmarToken, verificarToken, permitir, permitirPorMetodo };
