import { Component, input } from '@angular/core';

// Panel de resumen de una orden de compra (lista de insumos con su proveedor y el total).
// NOTA: por ahora ninguna página lo usa; quedó como componente de diseño. La página de Compras
// maneja sus órdenes con su propia tabla y formulario.
// Solo recibe datos (input) y los muestra: no pide nada al backend.
@Component({
  selector: 'app-orden-compra',
  imports: [],
  templateUrl: './orden-compra.html',
  styleUrl: './orden-compra.css',
})
export class OrdenCompra {
  // Lista de líneas de la orden. El tipo entre llaves describe cada elemento del arreglo.
  items = input.required<{ nombre: string; cantidad: number; precio: number; proveedor: string }[]>();
  total = input.required<number>();
  textoBoton = input<string>('PAGAR A PROVEEDOR');
}
