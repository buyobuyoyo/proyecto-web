import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../servicios/auth.service';

// Pantalla que ve quien intenta entrar a una página que su rol no permite.
@Component({
  selector: 'app-sin-acceso',
  imports: [RouterLink],
  templateUrl: './sin-acceso.html',
  styleUrl: './sin-acceso.css',
})
export class SinAcceso {
  auth = inject(AuthService);
}
