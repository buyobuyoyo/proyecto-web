import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Pantalla de inicio de sesión. De momento es solo una maqueta visual: los campos no se leen
// y el botón ENTRAR simplemente navega a /finanzas (no valida usuario ni contraseña).
// RouterLink es lo único que importa porque la plantilla lo usa en el botón.
@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {}
