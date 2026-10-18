import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes), provideClientHydration(),
    // Habilita HttpClient para llamar al backend. `withFetch()` usa fetch, que
    // también funciona cuando Angular renderiza en el servidor (SSR).
    provideHttpClient(withFetch()),
  ]
};
