// Funciones pequeñas para preparar los datos que entran y salen del API.

// Deja solo las columnas permitidas de un objeto. Así el cliente no puede
// colarnos campos que no queremos (ni inventar nombres de columnas en el SQL).
//
// Ejemplo: soloColumnas({ nombre: 'Latte', id: 99, hack: 1 }, ['nombre']) -> { nombre: 'Latte' }
function soloColumnas(objeto, columnas) {
  const resultado = {};
  for (const columna of columnas) {
    // `objeto &&` evita un error si no llegó cuerpo; `!== undefined` descarta lo que no vino
    // (pero conserva valores como 0, '' o null, que sí son datos válidos).
    if (objeto && objeto[columna] !== undefined) {
      resultado[columna] = objeto[columna];
    }
  }
  return resultado;
}

// Las consultas con JOIN y `nestTables: true` devuelven cada fila como
// { tabla1: {...}, tabla2: {...} }. Esto la aplana al formato que espera Angular:
// { ...columnasDeTabla1, tabla2: {...} }  (o tabla2: null si el LEFT JOIN no encontró nada).
//
// Ejemplo: { producto: { id: 1, nombre: 'Latte' }, categoria: { id: 3, nombre: 'Café' } }
//       -> { id: 1, nombre: 'Latte', categoria: { id: 3, nombre: 'Café' } }
function anidar(filas, tablaPrincipal, tablaRelacionada) {
  return filas.map((fila) => {
    const relacionada = fila[tablaRelacionada];
    return {
      // `...` copia todas las columnas de la tabla principal al nivel de arriba.
      ...fila[tablaPrincipal],
      // Con LEFT JOIN, si no hay coincidencia todas las columnas de la relacionada vienen
      // en null; por eso si su `id` es null se devuelve null en lugar de un objeto vacío.
      [tablaRelacionada]: relacionada && relacionada.id !== null ? relacionada : null,
    };
  });
}

// El frontend manda la fecha de la venta en ISO ('2026-10-17T21:00:00.000Z'),
// pero un DATETIME de MySQL no acepta la 'Z'. Se guarda en UTC como 'YYYY-MM-DD HH:MM:SS'.
function isoAMysql(iso) {
  // toISOString() da '2026-10-17T21:00:00.000Z'; slice(0, 19) conserva '2026-10-17T21:00:00'
  // y el replace cambia la 'T' por un espacio.
  return new Date(iso).toISOString().slice(0, 19).replace('T', ' ');
}

// Camino inverso: 'YYYY-MM-DD HH:MM:SS' (UTC) -> ISO, que es lo que Angular espera.
function mysqlAIso(fecha) {
  return fecha ? fecha.replace(' ', 'T') + 'Z' : fecha;
}

module.exports = { soloColumnas, anidar, isoAMysql, mysqlAIso };
