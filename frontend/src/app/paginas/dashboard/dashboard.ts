import { Component, computed, inject, signal } from '@angular/core';
import { DashboardService } from '../../servicios/dashboard.service';
import { Dashboard as DatosDashboard } from '../../modelos/dashboard.model';

// Panel del administrador: ventas de hoy, balance del mes, productos más vendidos y stock bajo.
// Solo muestra datos que ya existen; no modifica nada.
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private dashboardService = inject(DashboardService);

  // Los tres estados de la pantalla: datos, cargando y error (la plantilla muestra uno según el caso).
  datos = signal<DatosDashboard | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  // Total del día más alto de la semana: sirve para calcular la altura (%) de cada barra.
  // Math.max(1, ...) evita dividir entre 0 cuando no hay ventas. El `?.` y `?? []` cubren el caso
  // en que los datos todavía no han llegado.
  maxDia = computed(() => Math.max(1, ...(this.datos()?.ultimosDias.map((d) => d.total) ?? [])));

  constructor() {
    this.cargar();
  }

  // Pide el resumen al backend y lo guarda; si falla, `error` trae el mensaje.
  async cargar() {
    const { data, error } = await this.dashboardService.obtener();
    this.datos.set(data);
    this.error.set(error);
    this.cargando.set(false);
  }
}
