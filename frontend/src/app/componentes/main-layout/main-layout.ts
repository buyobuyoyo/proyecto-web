import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../navbar/navbar';

// Estructura común de todas las páginas internas: la barra de navegación arriba y,
// debajo, el contenido de la página activa. El login queda fuera de este layout (ver app.routes.ts).
// No tiene lógica: solo junta Navbar y RouterOutlet, que declara en `imports` porque su
// plantilla los usa.
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Navbar],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout {}
