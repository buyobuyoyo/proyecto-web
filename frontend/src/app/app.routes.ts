import { Routes } from '@angular/router';
import { Login } from './paginas/login/login';
import { MainLayout } from './componentes/main-layout/main-layout';
import { Finanzas } from './paginas/finanzas/finanzas';
import { Inventario } from './paginas/inventario/inventario';
import { Ventas } from './paginas/ventas/ventas';
import { HistorialVentas } from './paginas/historial-ventas/historial-ventas';
import { Compras } from './paginas/compras/compras';
import { Rh } from './paginas/rh/rh';

// Tabla de rutas: relaciona cada URL con el componente (página) que se muestra.
// Angular la recorre de arriba abajo y usa la primera que coincide.
export const routes: Routes = [
  // La raíz ('/') redirige al login. `pathMatch: 'full'` exige que la URL sea exactamente vacía.
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    // Ruta "padre" sin segmento propio: solo aporta el MainLayout (navbar + contenido).
    // Todas las páginas de `children` se dibujan dentro del <router-outlet> del layout,
    // así comparten la barra superior.
    path: '',
    component: MainLayout,
    children: [
      { path: 'finanzas', component: Finanzas },
      { path: 'inventario', component: Inventario },
      { path: 'ventas', component: Ventas }, // pantalla del cajero (punto de venta)
      { path: 'historial-ventas', component: HistorialVentas }, // tabla de ventas ya hechas
      { path: 'compras', component: Compras },
      { path: 'rh', component: Rh },
    ],
  },
  // Cualquier URL desconocida vuelve al login. Debe ir al final porque '**' coincide con todo.
  { path: '**', redirectTo: 'login' },
];
