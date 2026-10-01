import { PostgrestError } from '@supabase/supabase-js';

/*
   Traduce errores de Postgres/Supabase a mensajes en español entendibles
   para mostrar en la UI, en vez del mensaje crudo de la base de datos.
 */
export function mensajeErrorDb(error: PostgrestError): string {
  switch (error.code) {
    case '23505': // unique_violation
      return 'Ya existe un registro con ese nombre.';
    case '23503': // foreign_key_violation
      return 'No se puede eliminar: hay otros registros que dependen de este.';
    case '23502': // not_null_violation
      return 'Faltan campos obligatorios.';
    case '23514': // check_violation
      return 'Uno de los valores no cumple las reglas permitidas (por ejemplo, cantidad o precio inválidos).';
    default:
      return error.message;
  }
}
