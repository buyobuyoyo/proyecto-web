import { HttpErrorResponse } from '@angular/common/http';

/*
   Saca un mensaje en español de un error al llamar al API.
   Cuando algo falla, el backend responde { error: "mensaje" } con el texto
   ya traducido (ver backend/utils/errores.js); aquí solo se lee.
 */
export function mensajeErrorApi(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    // status 0 = ni siquiera hubo respuesta (backend apagado, CORS, sin red).
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. ¿Está encendido el backend?';
    }
    return error.error?.error ?? 'Ocurrió un error inesperado.';
  }
  return 'Ocurrió un error inesperado.';
}
