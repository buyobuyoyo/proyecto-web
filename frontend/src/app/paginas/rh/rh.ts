import { Component, computed, inject, signal } from '@angular/core';
import { EmpleadoCard } from '../../componentes/empleado-card/empleado-card';
import { EmpleadoService } from '../../servicios/empleado.service';
import { Empleado } from '../../modelos/empleado.model';

// RH es solo de consulta (alcance acordado con el profesor): aquí se listan y se ven
// los empleados. No se crean, editan ni eliminan.
//
// Conceptos que se usan en esta página (y en las demás):
//   - signal(valor): una "caja reactiva". Se lee con `x()` y se cambia con `x.set(nuevo)`.
//     Cuando cambia, Angular actualiza solo las partes del HTML que dependen de ella.
//   - computed(() => ...): un valor DERIVADO de otros signals; se recalcula solo cuando
//     cambian los signals que usa. No se asigna a mano.
//   - inject(Servicio): pide a Angular la instancia del servicio.
@Component({
  selector: 'app-rh',
  imports: [EmpleadoCard],
  templateUrl: './rh.html',
  styleUrl: './rh.css',
})
export class Rh {
  private empleadoService = inject(EmpleadoService);

  empleados = signal<Empleado[]>([]);
  // Bandera para mostrar "Cargando…" mientras llegan los datos.
  cargando = signal(true);
  // Mensaje de error (o null si todo va bien).
  error = signal<string | null>(null);

  // No hay tabla para esto en el esquema; es un objetivo de negocio fijo.
  staffRequerido = 15;

  // Solo cuentan los empleados en estado 'activo' (los dados de baja se ignoran).
  empleadosActivos = computed(() => this.empleados().filter((e) => e.estado === 'activo'));
  numEmpleados = computed(() => this.empleadosActivos().length);
  // Positivo = faltan empleados; negativo o cero = sobran o está completo.
  diferencia = computed(() => this.staffRequerido - this.numEmpleados());
  estado = computed(() => (this.diferencia() > 0 ? 'Understaffed' : 'Overstaffed'));
  // Promedio del rendimiento de los activos, redondeado a 1 decimal.
  rendimiento = computed(() => {
    const activos = this.empleadosActivos();
    if (activos.length === 0) return 0; // evita dividir entre cero
    // `reduce` va acumulando la suma de los rendimientos.
    const suma = activos.reduce((acc, e) => acc + e.rendimiento, 0);
    // Multiplicar por 10, redondear y dividir entre 10 deja un solo decimal.
    return Math.round((suma / activos.length) * 10) / 10;
  });

  // El constructor corre una sola vez al crear la página: aquí se piden los datos.
  constructor() {
    this.cargarDatos();
  }

  async cargarDatos() {
    this.cargando.set(true);
    this.error.set(null);

    // Desestructura la respuesta { data, error } del servicio.
    const { data, error } = await this.empleadoService.listar();
    if (error) {
      this.error.set(error);
      this.cargando.set(false);
      return;
    }

    this.empleados.set(data);
    this.cargando.set(false);
  }
}
