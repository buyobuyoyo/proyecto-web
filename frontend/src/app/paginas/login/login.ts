import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../servicios/auth.service';

// Pantalla de inicio de sesión: manda usuario y contraseña al backend y, si son correctos,
// entra a la página inicial del rol (administrador -> finanzas, cliente -> ventas).
@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  usuario = signal('');
  password = signal('');
  // Mensaje de error del último intento (o null).
  error = signal<string | null>(null);
  // Evita enviar dos veces mientras espera la respuesta.
  enviando = signal(false);

  async entrar(): Promise<void> {
    if (this.enviando()) return;
    this.error.set(null);
    this.enviando.set(true);
    const { error } = await this.auth.iniciarSesion(this.usuario().trim(), this.password());
    this.enviando.set(false);

    if (error) {
      this.error.set(error);
      return;
    }
    this.router.navigateByUrl(this.auth.rutaInicial());
  }
}
