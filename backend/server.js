// Punto de entrada del API. Se arranca con `npm start` (puerto 3200).
//
// Visión general: este archivo crea la aplicación Express, le conecta los "middlewares"
// (funciones que se ejecutan en cada petición antes de llegar a las rutas), monta cada grupo
// de rutas bajo /api/... y, al final, arranca el servidor.
require('dotenv').config(); // carga backend/.env en process.env (debe ir antes de usar process.env)
const express = require('express'); // framework web: maneja peticiones HTTP y rutas
const cors = require('cors'); // middleware que añade las cabeceras CORS (ver más abajo)
const { pool } = require('./config/db'); // pool de conexiones a MySQL
const { traducirError } = require('./utils/errores'); // convierte errores en mensajes para el usuario
const { ADMIN, CLIENTE, secretoJwt, verificarToken, permitir, permitirPorMetodo } = require('./middleware/auth');

secretoJwt(); // falla al arrancar si falta JWT_SECRET, en vez de fallar en el primer login

// `app` es la aplicación: a ella se le van registrando middlewares y rutas.
const app = express();

// CORS: por seguridad el navegador bloquea que una página (Angular en localhost:4200)
// llame a otro origen (este API en localhost:3200) salvo que el servidor lo permita.
// Aquí se permite solo a cualquier puerto de localhost (la expresión regular de abajo).
app.use(cors({ origin: /^http:\/\/localhost:\d+$/ }));
// Lee el cuerpo JSON de las peticiones POST/PUT y lo deja disponible en `req.body`.
app.use(express.json());

// Cada línea "monta" un grupo de rutas bajo un prefijo. Por ejemplo, GET /api/productos
// se resuelve en routes/productos.js, en su ruta '/'.
// Inicio de sesión: pública (login) y /yo, que valida el token por sí misma.
app.use('/api/auth', require('./routes/auth'));

// A partir de aquí todo exige token. Se aplica en cadena: verificarToken -> permisos -> ruta.
// Catálogo de productos: cualquier usuario con sesión lo consulta (el checkout lo necesita);
// solo el administrador lo modifica.
const consultaAbierta = permitirPorMetodo({ GET: [ADMIN, CLIENTE], '*': [ADMIN] });
app.use('/api/categorias', verificarToken, consultaAbierta, require('./routes/categorias'));
app.use('/api/productos', verificarToken, consultaAbierta, require('./routes/productos'));

// Compra en línea con PayPal: el servidor calcula precios y valida el pago (routes/checkout.js).
app.use('/api/checkout', verificarToken, permitir(ADMIN, CLIENTE), require('./routes/checkout'));

// Facturas XML: el administrador las gestiona todas; el cliente solo las de sus compras.
app.use('/api/facturas', verificarToken, permitir(ADMIN, CLIENTE), require('./routes/facturas'));

// Punto de venta del cajero: este API acepta precios y totales que manda el navegador, así
// que solo lo usa el administrador. El cliente compra únicamente por /api/checkout.
// Gestión interna: solo administrador.
app.use('/api/empleados', verificarToken, permitir(ADMIN), require('./routes/empleados'));
app.use('/api/ventas', verificarToken, permitir(ADMIN), require('./routes/ventas'));
app.use('/api/proveedores', verificarToken, permitir(ADMIN), require('./routes/proveedores'));
app.use('/api/finanzas', verificarToken, permitir(ADMIN), require('./routes/finanzas'));
app.use('/api/compras', verificarToken, permitir(ADMIN), require('./routes/compras'));
app.use('/api/usuarios', verificarToken, permitir(ADMIN), require('./routes/usuarios'));
app.use('/api/dashboard', verificarToken, permitir(ADMIN), require('./routes/dashboard'));

// Si la petición no coincidió con ninguna ruta de arriba, llega aquí: 404.
// (Express ejecuta los middlewares en el orden en que se registran, por eso va después.)
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// Manejador central de errores: cualquier error lanzado en una ruta llega aquí
// (Express 5 captura también los errores de funciones async).
// Se reconoce como manejador de errores porque recibe 4 parámetros (error, req, res, next).
app.use((error, req, res, next) => {
  const { estado, mensaje } = traducirError(error);
  // Los errores 500 son fallos inesperados: se muestran en la consola del servidor para
  // poder depurarlos. Los demás (validaciones, duplicados...) son normales y no se registran.
  if (estado === 500) {
    console.error(error);
  }
  res.status(estado).json({ error: mensaje });
});

// El puerto se puede cambiar con la variable de entorno PORT; si no existe, usa 3200.
const PUERTO = process.env.PORT || 3200;
app.listen(PUERTO, async (error) => {
  // En Express 5 el callback de listen recibe el error (por ejemplo, puerto ocupado).
  if (error) {
    console.error(`No se pudo abrir el puerto ${PUERTO}:`, error.message);
    process.exit(1);
  }
  console.log(`API escuchando en http://localhost:${PUERTO}`);
  // Prueba rápida de conexión para avisar de inmediato si MySQL está apagado.
  try {
    await pool.query('SELECT 1');
    console.log('Conexión a MySQL correcta (pos_cafeteria)');
  } catch (error) {
    console.error('No se pudo conectar a MySQL:', error.message);
  }
});
