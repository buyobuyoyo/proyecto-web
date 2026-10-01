import { Component, input } from '@angular/core';

@Component({
  selector: 'app-item-card',
  standalone: true,
  imports: [],
  templateUrl: './item-card.html',
  styleUrl: './item-card.css'
})
export class ItemCard { 
  titulo = input.required<string>();
  descripcion = input.required<string>();
  imagen = input.required<string>();   
}