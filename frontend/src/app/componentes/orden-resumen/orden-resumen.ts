import { Component, input } from '@angular/core';

// Panel de resumen de una orden de venta (productos, cantidades, total y quién atiende).
// NOTA: por ahora ninguna página lo usa; la pantalla del cajero (paginas/ventas) tiene su propio
// panel "Pedido actual". Solo recibe datos (input) y los muestra.
@Component({
  selector: 'app-orden-resumen',
  imports: [],
  templateUrl: './orden-resumen.html',
  styleUrl: './orden-resumen.css',
})
export class OrdenResumen {
  items = input.required<{ nombre: string; cantidad: number; precio: number }[]>();
  total = input.required<number>();
  // Etiqueta y nombre de la persona responsable (por ejemplo "Cajero: María").
  etiquetaResponsable = input<string>('Encargado');
  nombreResponsable = input<string>('');
  textoBoton = input<string>('PAGAR');
}
