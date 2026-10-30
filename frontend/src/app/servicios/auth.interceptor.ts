import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/*
   Interceptor: código que ve TODAS las peticiones HTTP antes de salir y todas las respuestas
   al volver. Aquí hace dos cosas:
     1. Agrega `Authorization: Bearer <token>` a las llamadas a nuestro API (y solo a ellas,
        para no filtrar el token a otros sitios).
     2. Si el API responde 401 con una sesión abierta (token vencido o inválido), cierra la
        sesión y lleva al login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // inject() funciona aquí porque el interceptor corre dentro del contexto de Angular.
  const auth = inject(AuthService);
  const token = auth.token();
  // Solo las URLs de nuestro backend reciben el token (nunca otros sitios, como PayPal).
  const esNuestroApi = req.url.startsWith(environment.apiUrl);

  // Las peticiones son inmutables: para agregar un encabezado se hace una copia con clone().
  const peticion = token && esNuestroApi
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  // next() manda la petición al siguiente paso y devuelve la respuesta como un flujo (Observable).
  return next(peticion).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && token && esNuestroApi) {
        // 401 con token = la sesión caducó o es inválida: se cierra y se va al login.
        auth.cerrarSesion();
      }
      // El error se vuelve a lanzar para que quien hizo la petición también se entere.
      return throwError(() => error);
    }),
  );
};
