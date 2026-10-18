import { RenderMode, ServerRoute } from '@angular/ssr';

// Le dice al servidor cómo generar cada ruta. `path: '**'` significa "todas las rutas".
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    // Prerender: el HTML de cada página se genera una sola vez al compilar (`ng build`),
    // en lugar de en cada visita.
    renderMode: RenderMode.Prerender
  }
];
