import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-empleado-card',
  imports: [],
  templateUrl: './empleado-card.html',
  styleUrl: './empleado-card.css',
})
export class EmpleadoCard {
  nombre = input.required<string>();
  cargo = input.required<string>();
  id = input.required<number>();
  foto = input<string>('/imagenes/logo.png');
  estado = input<'activo' | 'baja'>('activo');
  rendimiento = input<number>(0);
  mostrarAcciones = input(false);

  editar = output<void>();
  eliminar = output<void>();
}
