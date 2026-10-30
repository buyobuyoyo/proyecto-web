import { Routes } from '@angular/router';
import { Login } from './paginas/login/login';
import { MainLayout } from './componentes/main-layout/main-layout';
import { Finanzas } from './paginas/finanzas/finanzas';
import { Inventario } from './paginas/inventario/inventario';
import { Ventas } from './paginas/ventas/ventas';
import { HistorialVentas } from './paginas/historial-ventas/historial-ventas';
import { Compras } from './paginas/compras/compras';
import { Rh } from './paginas/rh/rh';
import { SinAcceso } from './paginas/sin-acceso/sin-acceso';
import { Terminos } from './paginas/terminos/terminos';
import { Privacidad } from './paginas/privacidad/privacidad';
import { Dashboard } from './paginas/dashboard/dashboard';
import { Usuarios } from './paginas/usuarios/usuarios';
import { Checkout } from './paginas/checkout/checkout';
import { Facturacion } from './paginas/facturacion/facturacion';
import { authGuard } from './guards/auth.guard';
import { rolGuard } from './guards/rol.guard';

// Quién puede entrar: el administrador a todo; el cliente solo al checkout.
const SOLO_ADMIN = { roles: ['administrador'] };
const ADMIN_Y_CLIENTE = { roles: ['administrador', 'cliente'] };

// Tabla de rutas: relaciona cada URL con el componente (página) que se muestra.
// Angular la recorre de arriba abajo y usa la primera que coincide.
export const routes: Routes = [
  // La raíz ('/') redirige al login. `pathMatch: 'full'` exige que la URL sea exactamente vacía.
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  // páginas legales públicas (se ven sin iniciar sesión)
  { path: 'terminos', component: Terminos },
  { path: 'privacidad', component: Privacidad },
  {
    // Ruta "padre" sin segmento propio: solo aporta el MainLayout (navbar + contenido).
    // Todas las páginas de `children` se dibujan dentro del <router-outlet> del layout,
    // así comparten la barra superior.
    // `canActivate: [authGuard]` exige sesión iniciada para todas las páginas internas; cada
    // hija añade `rolGuard` con los roles que pueden verla (ver guards/).
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: Dashboard, canActivate: [rolGuard], data: SOLO_ADMIN },
      { path: 'usuarios', component: Usuarios, canActivate: [rolGuard], data: SOLO_ADMIN },
      // comprobantes XML (el cliente solo ve los de sus compras)
      { path: 'facturacion', component: Facturacion, canActivate: [rolGuard], data: ADMIN_Y_CLIENTE },
      { path: 'finanzas', component: Finanzas, canActivate: [rolGuard], data: SOLO_ADMIN },
      { path: 'inventario', component: Inventario, canActivate: [rolGuard], data: SOLO_ADMIN },
      // pantalla del cajero (punto de venta): el backend solo deja al administrador usar ese API
      { path: 'ventas', component: Ventas, canActivate: [rolGuard], data: SOLO_ADMIN },
      // compra en línea con PayPal (administrador y cliente)
      { path: 'checkout', component: Checkout, canActivate: [rolGuard], data: ADMIN_Y_CLIENTE },
      // tabla de ventas ya hechas
      { path: 'historial-ventas', component: HistorialVentas, canActivate: [rolGuard], data: SOLO_ADMIN },
      { path: 'compras', component: Compras, canActivate: [rolGuard], data: SOLO_ADMIN },
      { path: 'rh', component: Rh, canActivate: [rolGuard], data: SOLO_ADMIN },
      { path: 'sin-acceso', component: SinAcceso },
    ],
  },
  // Cualquier URL desconocida vuelve al login. Debe ir al final porque '**' coincide con todo.
  { path: '**', redirectTo: 'login' },
];
