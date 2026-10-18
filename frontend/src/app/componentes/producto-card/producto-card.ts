import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-producto-card',
  imports: [],
  templateUrl: './producto-card.html',
  styleUrl: './producto-card.css',
})
export class ProductoCard {
  nombre = input.required<string>();
  etiqueta = input.required<string>();
  imagen = input<string>('/imagenes/logo.png');
  mostrarAcciones = input(false);

  editar = output<void>();
  eliminar = output<void>();
}
