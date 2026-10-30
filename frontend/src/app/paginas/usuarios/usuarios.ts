import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../componentes/modal/modal';
import { UsuarioService } from '../../servicios/usuario.service';
import { EmpleadoService } from '../../servicios/empleado.service';
import { AuthService } from '../../servicios/auth.service';
import { Usuario, UsuarioInput } from '../../modelos/usuario.model';
import { Empleado } from '../../modelos/empleado.model';

// Formulario en blanco para un usuario nuevo.
// (El rol por defecto es "cliente": el menos privilegiado, para no crear administradores por descuido.)
function usuarioVacio(): UsuarioInput {
  return { username: '', rol: 'cliente', id_empleado: null, password: '' };
}

// Página de Usuarios (solo administrador): lista las cuentas y permite crear, editar y eliminar.
// Mismo esquema que Inventario: signals para los datos, ngModel para el formulario del modal.
@Component({
  selector: 'app-usuarios',
  imports: [Modal, FormsModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios {
  private usuarioService = inject(UsuarioService);
  private empleadoService = inject(EmpleadoService);
  auth = inject(AuthService);

  usuarios = signal<Usuario[]>([]);
  empleados = signal<Empleado[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  modalAbierto = signal(false);
  // Si hay un usuario aquí, el modal está EDITANDO; si es null, está CREANDO.
  editando = signal<Usuario | null>(null);
  formError = signal<string | null>(null);
  guardando = signal(false);
  formulario: UsuarioInput = usuarioVacio();

  constructor() {
    this.cargarDatos();
  }

  // Pide usuarios y empleados a la vez (los empleados llenan el select de "Empleado").
  async cargarDatos() {
    const [usuarios, empleados] = await Promise.all([
      this.usuarioService.listar(),
      this.empleadoService.listar(),
    ]);
    this.error.set(usuarios.error ?? empleados.error);
    this.usuarios.set(usuarios.data);
    this.empleados.set(empleados.data);
    this.cargando.set(false);
  }

  abrirNuevo() {
    this.editando.set(null);
    this.formulario = usuarioVacio();
    this.formError.set(null);
    this.modalAbierto.set(true);
  }

  abrirEditar(usuario: Usuario) {
    this.editando.set(usuario);
    // La contraseña se deja vacía: solo se cambia si el administrador escribe una nueva.
    this.formulario = {
      username: usuario.username,
      rol: usuario.rol,
      id_empleado: usuario.id_empleado,
      password: '',
    };
    this.formError.set(null);
    this.modalAbierto.set(true);
  }

  cerrarModal() {
    this.modalAbierto.set(false);
  }

  // Crea o actualiza según haya un usuario en edición. Si el backend rechaza algo (usuario repetido,
  // contraseña corta...), el modal se queda abierto mostrando el motivo.
  async guardar() {
    this.guardando.set(true);
    this.formError.set(null);

    const editando = this.editando();
    const { error } = editando
      ? await this.usuarioService.actualizar(editando.id, this.formulario)
      : await this.usuarioService.crear(this.formulario);

    this.guardando.set(false);
    if (error) {
      this.formError.set(error);
      return;
    }
    this.modalAbierto.set(false);
    await this.cargarDatos();
  }

  async eliminar(usuario: Usuario) {
    // confirm() es el cuadro nativo "Aceptar / Cancelar" del navegador.
    if (!confirm(`¿Eliminar al usuario "${usuario.username}"?`)) {
      return;
    }
    const { error } = await this.usuarioService.eliminar(usuario.id);
    if (error) {
      this.error.set(error);
      return;
    }
    this.error.set(null);
    await this.cargarDatos();
  }
}
