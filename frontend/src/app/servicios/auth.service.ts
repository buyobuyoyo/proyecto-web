import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { mensajeErrorApi } from '../utilidades/api-errores';

// Roles que existen en la tabla `usuario` del backend.
// Un "type" con valores literales: TypeScript solo acepta estos dos textos como rol.
export type Rol = 'administrador' | 'cliente';

export interface UsuarioSesion {
  id: number;
  username: string;
  rol: Rol;
}

interface RespuestaLogin {
  token: string;
  usuario: UsuarioSesion;
}

// Clave bajo la que se guarda la sesión en el navegador.
const CLAVE_SESION = 'pos-cafeteria.sesion';

/*
   Sesión del usuario: inicia y cierra sesión y recuerda quién es. El token se guarda en
   localStorage para que la sesión sobreviva a recargar la página. localStorage solo existe en
   el navegador (no en el servidor del SSR), por eso cada acceso va protegido.
   Mismo patrón de respuesta { error } que los demás servicios.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  // signal = valor reactivo: cuando cambia, todo lo que lo lee (plantillas, computed) se actualiza solo.
  // Arranca leyendo la sesión guardada, para no pedir login otra vez al recargar la página.
  private sesion = signal<RespuestaLogin | null>(this.leerSesionGuardada());

  // Lecturas reactivas para plantillas y guards.
  // computed = valor DERIVADO de otro signal; se recalcula solo cuando `sesion` cambia.
  usuario = computed(() => this.sesion()?.usuario ?? null);
  token = computed(() => this.sesion()?.token ?? null);
  haIniciadoSesion = computed(() => this.sesion() !== null);
  esAdmin = computed(() => this.usuario()?.rol === 'administrador');

  // POST /api/auth/login -> guarda token y usuario si las credenciales son correctas.
  async iniciarSesion(username: string, password: string): Promise<{ error: string | null }> {
    try {
      const respuesta = await firstValueFrom(
        this.http.post<RespuestaLogin>(`${environment.apiUrl}/auth/login`, { username, password }),
      );
      this.sesion.set(respuesta); // en memoria (para la app)
      this.guardarSesion(respuesta); // en localStorage (para sobrevivir a un F5)
      return { error: null };
    } catch (e) {
      return { error: mensajeErrorApi(e) };
    }
  }

  // Borra la sesión y vuelve al login.
  cerrarSesion(): void {
    this.sesion.set(null);
    if (this.esNavegador) {
      try {
        localStorage.removeItem(CLAVE_SESION);
      } catch {
        // Almacenamiento bloqueado por el navegador: la sesión en memoria ya se borró.
      }
    }
    this.router.navigate(['/login']);
  }

  // ¿El usuario actual tiene alguno de estos roles? Lo usan rolGuard y las plantillas.
  tieneRol(...roles: Rol[]): boolean {
    const rol = this.usuario()?.rol;
    return rol !== undefined && roles.includes(rol);
  }

  // Primera página a la que se entra tras iniciar sesión, según el rol.
  rutaInicial(): string {
    return this.esAdmin() ? '/dashboard' : '/checkout';
  }

  // localStorage solo guarda texto, por eso el objeto se convierte con JSON.stringify.
  private guardarSesion(sesion: RespuestaLogin): void {
    if (!this.esNavegador) return;
    try {
      localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    } catch {
      // Si no se puede guardar, la sesión dura solo hasta recargar la página.
    }
  }

  private leerSesionGuardada(): RespuestaLogin | null {
    if (!this.esNavegador) return null;
    try {
      const texto = localStorage.getItem(CLAVE_SESION);
      if (!texto) return null;
      const sesion = JSON.parse(texto) as RespuestaLogin;
      // Se descarta lo guardado si no tiene token y rol (datos corruptos o manipulados a mano).
      return sesion?.token && sesion?.usuario?.rol ? sesion : null;
    } catch {
      return null;
    }
  }
}
