// Punto de entrada de Angular en el NAVEGADOR: aquí arranca la aplicación.
// `bootstrapApplication` toma el componente raíz (App, la etiqueta <app-root> de index.html)
// y la configuración global (appConfig: rutas, HttpClient, etc.) y monta todo en la página.
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  // Si el arranque falla (error de configuración, etc.), se muestra en la consola.
  .catch((err) => console.error(err));
