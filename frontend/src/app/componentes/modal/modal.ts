import { Component, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  imports: [],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  abierto = input(false);
  titulo = input('');
  cerrar = output<void>();

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.abierto()) {
      this.cerrar.emit();
    }
  }
}
