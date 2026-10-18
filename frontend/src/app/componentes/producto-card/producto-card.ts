import { Component, input, output } from '@angular/core';

// Tarjeta reutilizable de un producto (imagen, nombre y una etiqueta con precio/stock).
// La usa la página de Inventario dentro de un @for. Mismo esquema que EmpleadoCard:
// input() = datos que entran, output() = eventos que salen hacia la página.
@Component({
  selector: 'app-producto-card',
  imports: [],
  templateUrl: './producto-card.html',
  styleUrl: './producto-card.css',
})
export class ProductoCard {
  nombre = input.required<string>();
  // Texto de la franja inferior; el padre lo arma (por ejemplo "$45.00 · 12 en stock").
  etiqueta = input.required<string>();
  // Los productos no guardan imagen en la base de datos, así que se usa el logo por defecto.
  imagen = input<string>('/imagenes/logo.png');
  // Muestra los botones de editar/eliminar (Inventario los activa).
  mostrarAcciones = input(false);

  // Eventos hacia el padre (la página decide qué hacer: abrir un modal, confirmar el borrado...).
  editar = output<void>();
  eliminar = output<void>();
}
