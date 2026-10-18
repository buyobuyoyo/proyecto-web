import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../componentes/modal/modal';
import { FinanzaService } from '../../servicios/finanza.service';
import { Finanza, FinanzaInput, TipoFinanza } from '../../modelos/finanza.model';

// Valores iniciales de un movimiento nuevo (formulario en blanco): hoy, gasto de personal, $0.
function finanzaVacia(): FinanzaInput {
  return {
    // toISOString() da '2026-10-18T05:30:00.000Z'; slice(0, 10) se queda con '2026-10-18'
    // (el formato que espera <input type="date"> y la columna DATE de MySQL).
    fecha: new Date().toISOString().slice(0, 10),
    tipo: 'gasto_personal',
    monto: 0,
    origen: null,
  };
}

// Página de Finanzas: muestra totales, un gráfico de barras, el resumen por día y la lista de
// movimientos (ingresos y gastos), con alta, edición y baja de movimientos manuales.
// Las ventas y compras confirmadas también aparecen aquí porque el backend las registra solo.
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

  // Suma de montos por tipo. Se recalcula sola cuando cambia `registros`.
  totales = computed(() => {
    const registros = this.registros();
    // Función auxiliar: filtra los registros de ese tipo y suma sus montos.
    const sumaPorTipo = (tipo: TipoFinanza) =>
      registros.filter((r) => r.tipo === tipo).reduce((acc, r) => acc + r.monto, 0);

    return {
      insumos: sumaPorTipo('gasto_insumo'),
      personal: sumaPorTipo('gasto_personal'),
      ventas: sumaPorTipo('ingreso_venta'),
    };
  });

  // Evita dividir entre 0 en las barras cuando no hay registros todavía.
  // La barra más alta mide el 100 % del gráfico y las demás se escalan contra este máximo.
  maxTotal = computed(() => Math.max(this.totales().insumos, this.totales().personal, this.totales().ventas, 1));

  // Agrupa los registros por día y suma cada tipo: [{ fecha, insumos, personal, ventas }, ...]
  finanzasPorDia = computed(() => {
    // Un Map funciona como diccionario: clave = fecha, valor = la fila acumulada de ese día.
    const porFecha = new Map<string, { fecha: string; insumos: number; personal: number; ventas: number }>();

    for (const r of this.registros()) {
      // Si ya hay fila para esa fecha se reutiliza; si no, se crea una en ceros (`??`).
      const fila = porFecha.get(r.fecha) ?? { fecha: r.fecha, insumos: 0, personal: 0, ventas: 0 };
      if (r.tipo === 'gasto_insumo') fila.insumos += r.monto;
      else if (r.tipo === 'gasto_personal') fila.personal += r.monto;
      else fila.ventas += r.monto;
      porFecha.set(r.fecha, fila);
    }

    // Se ordenan del día más reciente al más antiguo (comparando las fechas como texto,
    // que funciona porque el formato 'YYYY-MM-DD' ordena igual alfabética y cronológicamente).
    return Array.from(porFecha.values()).sort((a, b) => b.fecha.localeCompare(a.fecha));
  });

  // --- Estado del formulario modal ---
  modalAbierto = signal(false);
  // Si hay un registro aquí, el formulario está EDITANDO; si es null, está CREANDO.
  registroEditando = signal<Finanza | null>(null);
  formRegistro: FinanzaInput = finanzaVacia();
  formError = signal<string | null>(null);
  guardando = signal(false);

  constructor() {
    this.cargarDatos();
  }

  // Pide los movimientos al backend. Se llama al abrir la página y después de cada cambio.
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

  // Abre el modal con el formulario vacío para crear un movimiento.
  abrirNuevoRegistro() {
    this.registroEditando.set(null);
    this.formRegistro = finanzaVacia();
    this.formError.set(null);
    this.modalAbierto.set(true);
  }

  // Abre el modal con los datos del movimiento cargados (se copian, no se comparte el objeto).
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

  // Se ejecuta al enviar el formulario: crea o actualiza según haya un registro en edición.
  async guardarRegistro() {
    this.guardando.set(true);
    this.formError.set(null);

    // `origen` es opcional: si queda vacío se guarda null en vez de ''.
    const datos: FinanzaInput = {
      ...this.formRegistro,
      origen: this.formRegistro.origen?.trim() || null,
    };

    const editando = this.registroEditando();
    const { error } = editando
      ? await this.finanzaService.actualizar(editando.id, datos)
      : await this.finanzaService.crear(datos);

    this.guardando.set(false);

    // Si el backend rechazó el guardado, el modal se queda abierto mostrando el motivo.
    if (error) {
      this.formError.set(error);
      return;
    }

    this.modalAbierto.set(false);
    await this.cargarDatos();
  }

  async eliminarRegistro(registro: Finanza) {
    // confirm() es el cuadro nativo del navegador "Aceptar / Cancelar".
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
