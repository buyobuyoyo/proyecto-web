// Conexión a MySQL (XAMPP) con un pool de mysql2.
// Los valores por defecto son los de XAMPP; se pueden cambiar con variables de entorno.
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pos_cafeteria',
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
async function conTransaccion(trabajo) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await trabajo(conexion);
    await conexion.commit();
    return resultado;
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

module.exports = { pool, conTransaccion };
