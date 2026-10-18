// Punto de entrada del API. Se arranca con `npm start` (puerto 3200).
//
// Visión general: este archivo crea la aplicación Express, le conecta los "middlewares"
// (funciones que se ejecutan en cada petición antes de llegar a las rutas), monta cada grupo
// de rutas bajo /api/... y, al final, arranca el servidor.
const express = require('express'); // framework web: maneja peticiones HTTP y rutas
const cors = require('cors'); // middleware que añade las cabeceras CORS (ver más abajo)
const { pool } = require('./config/db'); // pool de conexiones a MySQL
const { traducirError } = require('./utils/errores'); // convierte errores en mensajes para el usuario

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
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/proveedores', require('./routes/proveedores'));
app.use('/api/empleados', require('./routes/empleados'));
app.use('/api/finanzas', require('./routes/finanzas'));
app.use('/api/compras', require('./routes/compras'));
app.use('/api/ventas', require('./routes/ventas'));

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
