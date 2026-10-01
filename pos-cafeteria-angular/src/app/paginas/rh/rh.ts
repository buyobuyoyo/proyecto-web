import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmpleadoCard } from '../../componentes/empleado-card/empleado-card';
import { Modal } from '../../componentes/modal/modal';
import { EmpleadoService } from '../../servicios/empleado.service';
import { Empleado, EmpleadoInput } from '../../modelos/empleado.model';

function empleadoVacio(): EmpleadoInput {
  return {
    nombre: '',
    cargo: '',
    estado: 'activo',
    foto: null,
    rendimiento: 0,
    fecha_alta: new Date().toISOString().slice(0, 10),
  };
}

@Component({
  selector: 'app-rh',
  imports: [EmpleadoCard, Modal, FormsModule],
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

  modalAbierto = signal(false);
  empleadoEditando = signal<Empleado | null>(null);
  formError = signal<string | null>(null);
  guardando = signal(false);

  formEmpleado: EmpleadoInput = empleadoVacio();

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

  abrirNuevoEmpleado() {
    this.empleadoEditando.set(null);
    this.formEmpleado = empleadoVacio();
    this.formError.set(null);
    this.modalAbierto.set(true);
  }

  abrirEditarEmpleado(empleado: Empleado) {
    this.empleadoEditando.set(empleado);
    this.formEmpleado = {
      nombre: empleado.nombre,
      cargo: empleado.cargo,
      estado: empleado.estado,
      foto: empleado.foto,
      rendimiento: empleado.rendimiento,
      fecha_alta: empleado.fecha_alta,
    };
    this.formError.set(null);
    this.modalAbierto.set(true);
  }

  cerrarModal() {
    this.modalAbierto.set(false);
  }

  async guardarEmpleado() {
    this.guardando.set(true);
    this.formError.set(null);

    const datos: EmpleadoInput = {
      ...this.formEmpleado,
      foto: this.formEmpleado.foto?.trim() || null,
    };

    const editando = this.empleadoEditando();
    const { error } = editando
      ? await this.empleadoService.actualizar(editando.id, datos)
      : await this.empleadoService.crear(datos);

    this.guardando.set(false);

    if (error) {
      this.formError.set(error);
      return;
    }

    this.modalAbierto.set(false);
    await this.cargarDatos();
  }

  async eliminarEmpleado(empleado: Empleado) {
    if (!confirm(`¿Eliminar al empleado "${empleado.nombre}"?`)) {
      return;
    }
    const { error } = await this.empleadoService.eliminar(empleado.id);
    if (error) {
      alert(error);
      return;
    }
    await this.cargarDatos();
  }
}
