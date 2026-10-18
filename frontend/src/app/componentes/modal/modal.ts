import { Component, HostListener, input, output } from '@angular/core';

// Ventana emergente (modal) reutilizable: oscurece la pantalla y muestra un panel al centro.
// Las páginas la usan así:
//   <app-modal [abierto]="..." titulo="..." (cerrar)="...">  ...formulario...  </app-modal>
// El contenido que se escribe entre las etiquetas se coloca donde está <ng-content> (ver modal.html).
// El componente NO decide cuándo abrirse ni cerrarse: la página le dice `abierto` y escucha `cerrar`.
@Component({
  selector: 'app-modal',
  imports: [],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  abierto = input(false); // true = se muestra
  titulo = input(''); // texto del encabezado
  cerrar = output<void>(); // se emite al pulsar la X, hacer clic fuera o presionar Escape

  // @HostListener engancha un evento global: aquí, cualquier pulsación de la tecla Escape
  // en el documento. Solo cierra si el modal está abierto (si no, no debe hacer nada).
  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.abierto()) {
      this.cerrar.emit();
    }
  }
}
