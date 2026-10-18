import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

// Configuración adicional que solo aplica cuando la app corre en el servidor (SSR).
const serverConfig: ApplicationConfig = {
  providers: [
    // Activa el renderizado en servidor usando las reglas de app.routes.server.ts.
    provideServerRendering(withRoutes(serverRoutes))
  ]
};

// Se combinan la configuración normal (appConfig) y la del servidor en una sola.
export const config = mergeApplicationConfig(appConfig, serverConfig);
