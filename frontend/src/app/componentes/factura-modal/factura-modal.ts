import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Modal } from '../modal/modal';
import { FacturaService } from '../../servicios/factura.service';
import { ResultadoCorreo } from '../../modelos/factura.model';

// Ventana para pedir los datos del receptor y generar la factura de una venta.
// La usan Checkout (el cliente factura su compra) y Facturación (el administrador).
// Se muestra mientras `idVenta` tenga valor; avisa con `creada` o `cerrar`.
@Component({
  selector: 'app-factura-modal',
  imports: [Modal, FormsModule],
  templateUrl: './factura-modal.html',
})
export class FacturaModal {
  private facturaService = inject(FacturaService);

  // input() = dato que recibe del componente padre; output() = evento que le avisa al padre.
  idVenta = input<number | null>(null);
  creada = output<ResultadoCorreo & { folio: string }>();
  cerrar = output<void>();

  // Campos del formulario; [(ngModel)] en el HTML los mantiene sincronizados con lo que se escribe.
  formulario = { nombre_receptor: '', rfc_receptor: '', correo_receptor: '' };
  guardando = signal(false);
  error = signal<string | null>(null);

  async guardar() {
    // idVenta() con paréntesis: así se lee el valor de un input signal.
    const idVenta = this.idVenta();
    if (idVenta === null) return;
    this.guardando.set(true);
    this.error.set(null);
    const { data, error } = await this.facturaService.crear({ id_venta: idVenta, ...this.formulario });
    this.guardando.set(false);
    if (error || !data) {
      this.error.set(error);
      return;
    }
    // Se avisa al padre (Checkout o Facturación) para que cierre el modal y muestre el resultado.
    this.creada.emit(data);
  }
}
