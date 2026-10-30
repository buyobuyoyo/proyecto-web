import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../servicios/auth.service';

/*
   Guard: decide si Angular deja entrar a una ruta. Este pide haber iniciado sesión; si no,
   redirige al login. (Es solo comodidad de la interfaz: la seguridad real la aplica el
   backend con el token en cada petición.)
   En el servidor (SSR/prerender) no hay sesión que revisar, así que deja pasar y la revisión
   real ocurre en el navegador al cargar la página.
 */
export const authGuard: CanActivateFn = () => {
  // En el servidor (SSR) no existe localStorage ni sesión: se deja pasar y se revisa en el navegador.
  if (isPlatformServer(inject(PLATFORM_ID))) return true;
  const auth = inject(AuthService);
  // Devolver `true` permite entrar; devolver un UrlTree redirige a esa ruta sin entrar a la actual.
  return auth.haIniciadoSesion() ? true : inject(Router).createUrlTree(['/login']);
};
