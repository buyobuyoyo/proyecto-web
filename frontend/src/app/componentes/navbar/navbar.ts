import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../servicios/auth.service';

// Barra de navegación superior. Muestra solo los enlaces que el rol del usuario puede usar
// (el administrador ve todo; el cliente, solo Ventas) y cierra la sesión. Su plantilla usa
// RouterLink (navegar sin recargar la página) y RouterLinkActive (marcar el enlace de la
// página actual), por eso son lo que importa.
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  auth = inject(AuthService);
}
