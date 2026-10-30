import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Términos y condiciones: página pública, accesible sin iniciar sesión.
@Component({
  selector: 'app-terminos',
  imports: [RouterLink],
  templateUrl: './terminos.html',
  styleUrl: './terminos.css',
})
export class Terminos {}
