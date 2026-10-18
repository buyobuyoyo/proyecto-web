// Errores del API y su traducción a mensajes en español para la interfaz.
// Equivale a lo que hacía `mensajeErrorDb` en el frontend con los códigos de Postgres.

// Error "esperado" (validaciones de negocio): se lanza con throw y llega al usuario tal cual.
// Ejemplo: throw new ErrorNegocio('Stock insuficiente.', 409);
class ErrorNegocio extends Error {
  // `estado` es el código HTTP que se responderá (400 = datos inválidos por defecto).
  constructor(mensaje, estado = 400) {
    super(mensaje);
    this.estado = estado;
  }
}

// Convierte cualquier error en { estado HTTP, mensaje }.
// El manejador central de server.js la llama para decidir qué responderle al cliente.
function traducirError(error) {
  // Nuestros propios errores ya traen el mensaje y el estado correctos.
  if (error instanceof ErrorNegocio) {
    return { estado: error.estado, mensaje: error.message };
  }

  // Los errores de MySQL traen un `code` que identifica qué restricción se violó.
  switch (error.code) {
    case 'ER_DUP_ENTRY': // llave única repetida
      return { estado: 409, mensaje: 'Ya existe un registro con ese nombre o código.' };
    case 'ER_ROW_IS_REFERENCED_2': // borrar algo que otra tabla usa
      return { estado: 409, mensaje: 'No se puede eliminar: hay otros registros que dependen de este.' };
    case 'ER_NO_REFERENCED_ROW_2': // apuntar a un id que no existe
      return { estado: 400, mensaje: 'Hace referencia a un registro que no existe.' };
    case 'ER_BAD_NULL_ERROR':
    case 'ER_NO_DEFAULT_FOR_FIELD':
      return { estado: 400, mensaje: 'Faltan campos obligatorios.' };
    case 'ER_CHECK_CONSTRAINT_VIOLATED': // MySQL
    case 'ER_CONSTRAINT_FAILED': // MariaDB
      return {
        estado: 400,
        mensaje: 'Uno de los valores no cumple las reglas permitidas (por ejemplo, cantidad o precio inválidos).',
      };
    case 'ECONNREFUSED':
    case 'ER_ACCESS_DENIED_ERROR':
    case 'ER_BAD_DB_ERROR':
      // 503 = servicio no disponible: el API funciona pero no logra hablar con MySQL.
      return { estado: 503, mensaje: 'No se pudo conectar con la base de datos. ¿Está MySQL encendido en XAMPP?' };
  }

  // Errores de express.json (JSON mal formado, etc.)
  if (error.status && error.status < 500) {
    return { estado: error.status, mensaje: 'Los datos enviados no son válidos.' };
  }

  // Cualquier otra cosa es un fallo nuestro e inesperado; no se revelan detalles al cliente.
  return { estado: 500, mensaje: 'Error interno del servidor.' };
}

module.exports = { ErrorNegocio, traducirError };
