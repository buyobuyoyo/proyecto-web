import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Componente raíz de la aplicación. Es la etiqueta <app-root> de index.html.
// No dibuja nada propio: su plantilla (app.html) solo contiene <router-outlet />, el hueco
// donde el enrutador (app.routes.ts) coloca la página que corresponda a la URL.
@Component({
  selector: 'app-root', // nombre de la etiqueta HTML que representa a este componente
  imports: [RouterOutlet], // en Angular moderno cada componente declara lo que usa en su plantilla
  templateUrl: './app.html', // archivo HTML del componente
  styleUrl: './app.css', // archivo de estilos (solo afecta a este componente)
})
export class App {}
