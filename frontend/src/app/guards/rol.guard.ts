import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Rol } from '../servicios/auth.service';

/*
   Guard por rol. Cada ruta declara quién puede entrar en `data: { roles: [...] }`
   (ver app.routes.ts). Si el rol del usuario no está en la lista, va a /sin-acceso.
   Se usa después de authGuard (que ya comprobó que hay sesión).
 */
export const rolGuard: CanActivateFn = (route) => {
  if (isPlatformServer(inject(PLATFORM_ID))) return true;
  // `route.data` es el objeto `data: { roles: [...] }` que se declaró en app.routes.ts.
  const roles = (route.data['roles'] ?? []) as Rol[];
  // tieneRol(...roles) = ¿el rol de la sesión está en la lista? Si no, se manda a /sin-acceso.
  return inject(AuthService).tieneRol(...roles) ? true : inject(Router).createUrlTree(['/sin-acceso']);
};
