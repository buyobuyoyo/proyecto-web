// Servidor Express del FRONTEND (no confundir con backend/server.js, que es el API de datos).
// Su trabajo es servir los archivos compilados de Angular y generar el HTML en el servidor (SSR).
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

// Carpeta con los archivos del navegador generados por `ng build`.
const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
// Motor que sabe renderizar la aplicación Angular en Node.
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
// Sirve los archivos estáticos (JS, CSS, imágenes). `maxAge: '1y'` los deja en caché un año
// (los nombres llevan un hash, así que si cambian se descargan de nuevo).
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
// Todo lo que no sea un archivo estático lo renderiza Angular. Si Angular no reconoce la
// ruta (`response` vacío) se pasa al siguiente middleware con next().
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
// Solo arranca el servidor si este archivo se ejecuta directamente (por ejemplo con `node`),
// no cuando Angular lo importa durante `ng serve` o `ng build`.
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
// Controlador que el Angular CLI usa durante el desarrollo (`ng serve`) y la compilación.
export const reqHandler = createNodeRequestHandler(app);
