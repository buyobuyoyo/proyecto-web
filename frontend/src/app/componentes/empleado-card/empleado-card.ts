import { Component, input, output } from '@angular/core';

// Tarjeta reutilizable que muestra a UN empleado (foto, estado, nombre, cargo, rendimiento).
// La usa la página de RH dentro de un @for.
//
// Un componente se comunica con su "padre" (la página que lo usa) por dos vías:
//   - input()  = datos que ENTRAN. El padre los pasa así: [nombre]="empleado.nombre"
//   - output() = eventos que SALEN. El padre los escucha así: (editar)="abrirEditar()"
// Los inputs de Angular moderno son "signals": se leen llamándolos como función, `nombre()`.
@Component({
  selector: 'app-empleado-card', // etiqueta que se usa en el HTML del padre
  imports: [],
  templateUrl: './empleado-card.html',
  styleUrl: './empleado-card.css',
})
export class EmpleadoCard {
  // `input.required` = el padre está obligado a pasarlo (si no, no compila).
  nombre = input.required<string>();
  cargo = input.required<string>();
  id = input.required<number>();
  // `input<T>(valor)` = opcional, con ese valor por defecto si el padre no lo pasa.
  foto = input<string>('/imagenes/logo.png');
  estado = input<'activo' | 'baja'>('activo');
  rendimiento = input<number>(0);
  // Muestra u oculta los botones de editar/eliminar (RH es solo consulta, así que no se usan).
  mostrarAcciones = input(false);

  // Eventos hacia el padre. `output<void>()` = se emite sin datos; el padre decide qué hacer.
  editar = output<void>();
  eliminar = output<void>();
}
