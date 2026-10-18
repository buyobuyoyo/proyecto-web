import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

// Barra de navegación superior. No tiene lógica propia: su plantilla (navbar.html) solo usa
// RouterLink (para navegar sin recargar la página) y RouterLinkActive (para marcar el enlace
// de la página actual), por eso son lo único que importa.
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {}
