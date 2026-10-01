import { Routes } from '@angular/router';
import { Inicio } from './paginas/inicio/inicio';
import { Galeria } from './paginas/galeria/galeria';

export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'galeria', component: Galeria }
];