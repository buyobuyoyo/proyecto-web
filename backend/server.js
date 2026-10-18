// Punto de entrada del API. Se arranca con `npm start` (puerto 3200).
const express = require('express');
const cors = require('cors');
const { pool } = require('./config/db');
const { traducirError } = require('./utils/errores');

const app = express();

// Permite que Angular (ng serve en cualquier puerto de localhost) llame a este API.
app.use(cors({ origin: /^http:\/\/localhost:\d+$/ }));
// Lee el cuerpo JSON de las peticiones POST/PUT.
app.use(express.json());

app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/proveedores', require('./routes/proveedores'));
app.use('/api/empleados', require('./routes/empleados'));
app.use('/api/finanzas', require('./routes/finanzas'));
app.use('/api/compras', require('./routes/compras'));
app.use('/api/ventas', require('./routes/ventas'));

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// Manejador central de errores: cualquier error lanzado en una ruta llega aquí
// (Express 5 captura también los errores de funciones async).
app.use((error, req, res, next) => {
  const { estado, mensaje } = traducirError(error);
  if (estado === 500) {
    console.error(error);
  }
  res.status(estado).json({ error: mensaje });
});

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
