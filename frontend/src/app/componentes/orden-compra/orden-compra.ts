import { Component, input } from '@angular/core';

@Component({
  selector: 'app-orden-compra',
  imports: [],
  templateUrl: './orden-compra.html',
  styleUrl: './orden-compra.css',
})
export class OrdenCompra {
  items = input.required<{ nombre: string; cantidad: number; precio: number; proveedor: string }[]>();
  total = input.required<number>();
  textoBoton = input<string>('PAGAR A PROVEEDOR');
}
