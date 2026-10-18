// Conexión a MySQL (XAMPP) con un pool de mysql2.
// Los valores por defecto son los de XAMPP; se pueden cambiar con variables de entorno.
//
// Un "pool" es un conjunto de conexiones ya abiertas que se reutilizan: abrir una conexión
// nueva por cada petición sería lento. Cada consulta toma una conexión libre del pool,
// la usa y la devuelve.
const mysql = require('mysql2/promise'); // versión de mysql2 que trabaja con async/await

const pool = mysql.createPool({
  // `process.env.X || 'valor'` = usa la variable de entorno X si existe; si no, el valor por defecto.
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pos_cafeteria',
  // Máximo de conexiones abiertas a la vez.
  connectionLimit: 10,
  // Por defecto mysql2 devuelve los DECIMAL como texto ("100.00").
  // El frontend espera números (precio, total, monto...), así que se convierten aquí.
  decimalNumbers: true,
  // DATE llega como 'YYYY-MM-DD' y DATETIME como 'YYYY-MM-DD HH:MM:SS' (texto),
  // en vez de objetos Date que cambiarían de formato y de zona horaria al pasar a JSON.
  dateStrings: true,
});

// Ejecuta `trabajo` dentro de una transacción: si algo falla, se deshace TODO lo
// que se hizo (por ejemplo, una venta guardada sin haber descontado el stock).
//
// Uso: conTransaccion(async (conexion) => { ...consultas con `conexion`... })
// Importante: dentro de `trabajo` hay que usar `conexion` y NO `pool`, porque la transacción
// vive en una sola conexión; si se usara el pool, esa consulta quedaría fuera de la transacción.
async function conTransaccion(trabajo) {
  // Se toma UNA conexión del pool para que todas las consultas compartan la misma transacción.
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await trabajo(conexion);
    // Si `trabajo` terminó sin errores, se confirman todos los cambios de golpe.
    await conexion.commit();
    return resultado;
  } catch (error) {
    // Si algo lanzó un error, se deshacen todos los cambios y se relanza el error
    // para que llegue al manejador central de server.js.
    await conexion.rollback();
    throw error;
  } finally {
    // `finally` corre siempre (con éxito o con error): la conexión se devuelve al pool.
    conexion.release();
  }
}

module.exports = { pool, conTransaccion };
