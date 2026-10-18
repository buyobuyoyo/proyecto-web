import { Component, computed, inject, signal } from '@angular/core';
import { EmpleadoCard } from '../../componentes/empleado-card/empleado-card';
import { EmpleadoService } from '../../servicios/empleado.service';
import { Empleado } from '../../modelos/empleado.model';

// RH es solo de consulta (alcance acordado con el profesor): aquí se listan y se ven
// los empleados. No se crean, editan ni eliminan.
@Component({
  selector: 'app-rh',
  imports: [EmpleadoCard],
  templateUrl: './rh.html',
  styleUrl: './rh.css',
})
export class Rh {
  private empleadoService = inject(EmpleadoService);

  empleados = signal<Empleado[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  // No hay tabla para esto en el esquema; es un objetivo de negocio fijo.
  staffRequerido = 15;

  empleadosActivos = computed(() => this.empleados().filter((e) => e.estado === 'activo'));
  numEmpleados = computed(() => this.empleadosActivos().length);
  diferencia = computed(() => this.staffRequerido - this.numEmpleados());
  estado = computed(() => (this.diferencia() > 0 ? 'Understaffed' : 'Overstaffed'));
  rendimiento = computed(() => {
    const activos = this.empleadosActivos();
    if (activos.length === 0) return 0;
    const suma = activos.reduce((acc, e) => acc + e.rendimiento, 0);
    return Math.round((suma / activos.length) * 10) / 10;
  });

  constructor() {
    this.cargarDatos();
  }

  async cargarDatos() {
    this.cargando.set(true);
    this.error.set(null);

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
