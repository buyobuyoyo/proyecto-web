import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemCard } from '../../componentes/item-card/item-card';

@Component({
  selector: 'app-galeria',
  standalone: true, 
  imports: [CommonModule, ItemCard],
  templateUrl: './galeria.html',
  styleUrls: ['./galeria.css']
})
export class Galeria {

  listaItems = [
    { 
      titulo: '#1', 
      descripcion: 'apple',
      imagen: '/imagenes/gallery/apple.jpg'
    },
    { 
      titulo: '#2', 
      descripcion: 'julius.',
      imagen: '/imagenes/gallery/lulu.png'
    },
    { 
      titulo: '#3', 
      descripcion: 'bedtime.',
      imagen: '/imagenes/gallery/bedtime.jpg'
    },
    { 
      titulo: '#4', 
      descripcion: 'relleno xd no he dibujado mucho.',
      imagen: '/imagenes/carta.png'
    }
  ];

}