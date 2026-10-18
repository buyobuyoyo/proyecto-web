// Punto de entrada de Angular en el SERVIDOR (SSR: Server-Side Rendering).
// Con SSR, el servidor genera el HTML de cada página antes de enviarla al navegador, y luego
// el navegador "hidrata" ese HTML (main.ts) para que se vuelva interactivo.
// Aquí se hace lo mismo que en main.ts, pero con la configuración extra del servidor.
import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

// `context` lo entrega Angular en cada petición renderizada en el servidor.
const bootstrap = (context: BootstrapContext) =>
    bootstrapApplication(App, config, context);

export default bootstrap;
