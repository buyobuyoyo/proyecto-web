import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../componentes/modal/modal';
import { FinanzaService } from '../../servicios/finanza.service';
import { Finanza, FinanzaInput, TipoFinanza } from '../../modelos/finanza.model';

function finanzaVacia(): FinanzaInput {
  return {
    fecha: new Date().toISOString().slice(0, 10),
    tipo: 'gasto_personal',
    monto: 0,
    origen: null,
  };
}

@Component({
  selector: 'app-finanzas',
  imports: [Modal, FormsModule],
  templateUrl: './finanzas.html',
  styleUrl: './finanzas.css',
})
export class Finanzas {
  private finanzaService = inject(FinanzaService);

  registros = signal<Finanza[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  totales = computed(() => {
    const registros = this.registros();
    const sumaPorTipo = (tipo: TipoFinanza) =>
      registros.filter((r) => r.tipo === tipo).reduce((acc, r) => acc + r.monto, 0);

    return {
      insumos: sumaPorTipo('gasto_insumo'),
      personal: sumaPorTipo('gasto_personal'),
      ventas: sumaPorTipo('ingreso_venta'),
    };
  });

  // Evita dividir entre 0 en las barras cuando no hay registros todavía.
  maxTotal = computed(() => Math.max(this.totales().insumos, this.totales().personal, this.totales().ventas, 1));

  finanzasPorDia = computed(() => {
    const porFecha = new Map<string, { fecha: string; insumos: number; personal: number; ventas: number }>();

    for (const r of this.registros()) {
      const fila = porFecha.get(r.fecha) ?? { fecha: r.fecha, insumos: 0, personal: 0, ventas: 0 };
      if (r.tipo === 'gasto_insumo') fila.insumos += r.monto;
      else if (r.tipo === 'gasto_personal') fila.personal += r.monto;
      else fila.ventas += r.monto;
      porFecha.set(r.fecha, fila);
    }

    return Array.from(porFecha.values()).sort((a, b) => b.fecha.localeCompare(a.fecha));
  });

  modalAbierto = signal(false);
  registroEditando = signal<Finanza | null>(null);
  formRegistro: FinanzaInput = finanzaVacia();
  formError = signal<string | null>(null);
  guardando = signal(false);

  constructor() {
    this.cargarDatos();
  }

  async cargarDatos() {
    this.cargando.set(true);
    this.error.set(null);

    const { data, error } = await this.finanzaService.listar();
    if (error) {
      this.error.set(error);
      this.cargando.set(false);
      return;
    }

    this.registros.set(data);
    this.cargando.set(false);
  }

  abrirNuevoRegistro() {
    this.registroEditando.set(null);
    this.formRegistro = finanzaVacia();
    this.formError.set(null);
    this.modalAbierto.set(true);
  }

  abrirEditarRegistro(registro: Finanza) {
    this.registroEditando.set(registro);
    this.formRegistro = {
      fecha: registro.fecha,
      tipo: registro.tipo,
      monto: registro.monto,
      origen: registro.origen,
    };
    this.formError.set(null);
    this.modalAbierto.set(true);
  }

  cerrarModal() {
    this.modalAbierto.set(false);
  }

  async guardarRegistro() {
    this.guardando.set(true);
    this.formError.set(null);

    const datos: FinanzaInput = {
      ...this.formRegistro,
      origen: this.formRegistro.origen?.trim() || null,
    };

    const editando = this.registroEditando();
    const { error } = editando
      ? await this.finanzaService.actualizar(editando.id, datos)
      : await this.finanzaService.crear(datos);

    this.guardando.set(false);

    if (error) {
      this.formError.set(error);
      return;
    }

    this.modalAbierto.set(false);
    await this.cargarDatos();
  }

  async eliminarRegistro(registro: Finanza) {
    if (!confirm(`¿Eliminar este registro de "${registro.tipo}" por $${registro.monto.toFixed(2)}?`)) {
      return;
    }
    const { error } = await this.finanzaService.eliminar(registro.id);
    if (error) {
      alert(error);
      return;
    }
    await this.cargarDatos();
  }
}
