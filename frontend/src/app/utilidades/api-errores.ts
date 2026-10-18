import { HttpErrorResponse } from '@angular/common/http';

/*
   Saca un mensaje en español de un error al llamar al API.
   Cuando algo falla, el backend responde { error: "mensaje" } con el texto
   ya traducido (ver backend/utils/errores.js); aquí solo se lee.
 */
export function mensajeErrorApi(error: unknown): string {
  // `unknown` obliga a comprobar qué tipo de error es antes de usarlo; HttpErrorResponse
  // es el tipo que lanza HttpClient cuando el servidor responde con error.
  if (error instanceof HttpErrorResponse) {
    // status 0 = ni siquiera hubo respuesta (backend apagado, CORS, sin red).
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. ¿Está encendido el backend?';
    }
    // `error.error` es el cuerpo JSON de la respuesta ({ error: '...' }), de ahí `.error?.error`.
    // `?.` evita fallar si no hay cuerpo y `??` da el mensaje genérico en ese caso.
    return error.error?.error ?? 'Ocurrió un error inesperado.';
  }
  return 'Ocurrió un error inesperado.';
}
