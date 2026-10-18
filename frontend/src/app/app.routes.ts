import { Routes } from '@angular/router';
import { Login } from './paginas/login/login';
import { MainLayout } from './componentes/main-layout/main-layout';
import { Finanzas } from './paginas/finanzas/finanzas';
import { Inventario } from './paginas/inventario/inventario';
import { Ventas } from './paginas/ventas/ventas';
import { Compras } from './paginas/compras/compras';
import { Rh } from './paginas/rh/rh';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: '',
    component: MainLayout,
    children: [
      { path: 'finanzas', component: Finanzas },
      { path: 'inventario', component: Inventario },
      { path: 'ventas', component: Ventas },
      { path: 'compras', component: Compras },
      { path: 'rh', component: Rh },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
