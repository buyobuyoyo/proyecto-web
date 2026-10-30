import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Aviso de privacidad: página pública, accesible sin iniciar sesión.
@Component({
  selector: 'app-privacidad',
  imports: [RouterLink],
  templateUrl: './privacidad.html',
  styleUrl: './privacidad.css',
})
export class Privacidad {}
