import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';

// Configuración global de la aplicación. Cada `provide...` activa una función de Angular
// para toda la app, y los servicios pueden pedirla con inject().
export const appConfig: ApplicationConfig = {
  providers: [
    // Envía a la consola los errores que no atrapó ningún código.
    provideBrowserGlobalErrorListeners(),
    // Activa el enrutador con la tabla de rutas de app.routes.ts.
    // `provideClientHydration` reutiliza en el navegador el HTML que generó el servidor (SSR)
    // en vez de dibujarlo de cero.
    provideRouter(routes), provideClientHydration(),
    // Habilita HttpClient para llamar al backend. `withFetch()` usa fetch, que
    // también funciona cuando Angular renderiza en el servidor (SSR).
    provideHttpClient(withFetch()),
  ]
};
