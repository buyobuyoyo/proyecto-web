import { Component, input } from '@angular/core';

@Component({
  selector: 'app-orden-resumen',
  imports: [],
  templateUrl: './orden-resumen.html',
  styleUrl: './orden-resumen.css',
})
export class OrdenResumen {
  items = input.required<{ nombre: string; cantidad: number; precio: number }[]>();
  total = input.required<number>();
  etiquetaResponsable = input<string>('Encargado');
  nombreResponsable = input<string>('');
  textoBoton = input<string>('PAGAR');
}
