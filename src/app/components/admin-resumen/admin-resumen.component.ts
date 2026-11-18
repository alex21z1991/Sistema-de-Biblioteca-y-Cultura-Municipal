// HU-A12: Consultar panel administrativo [Administrador]
// Resumen de recursos, movimientos, multas, actividades y salas
// para tomar decisiones operativas.

import { Component, ElementRef, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { TarjetaIndicadorComponent } from '../tarjeta-indicador/tarjeta-indicador.component';
import { PanelAdminService } from '../../services/panel-admin.service';
import {
  EstadoVistaPanel,
  IResumenPanel,
  TipoMovimiento,
  TonoIndicador
} from '../../interfaces/ipanel-admin';

@Component({
  selector: 'app-admin-resumen',
  standalone: true,
  imports: [CommonModule, RouterLink, TarjetaIndicadorComponent],
  templateUrl: './admin-resumen.component.html',
  styleUrl: './admin-resumen.component.css'
})
export class AdminResumenComponent implements OnInit, OnDestroy {

  readonly Estado = EstadoVistaPanel;
  readonly Tono = TonoIndicador;
  readonly TipoMov = TipoMovimiento;

  estado: EstadoVistaPanel = EstadoVistaPanel.Cargando;
  resumen: IResumenPanel | null = null;
  mensajeError: string = '';

  private suscripcion?: Subscription;

  // Llevar el foco al error cuando aparece, para lectores de pantalla
  @ViewChild('alertaError')
  set alertaError(elemento: ElementRef<HTMLDivElement> | undefined) {
    elemento?.nativeElement.focus();
  }

  constructor(
    private panelService: PanelAdminService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.cargar();
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  cargar(): void {
    this.suscripcion?.unsubscribe();
    this.estado = EstadoVistaPanel.Cargando;
    this.mensajeError = '';

    this.suscripcion = this.panelService.getResumen().subscribe({
      next: (datos) => {
        this.resumen = datos;
        this.estado = EstadoVistaPanel.Listo;
      },
      error: (err: Error) => {
        console.error('Error al cargar el panel administrativo:', err);
        this.mensajeError = err?.message || 'No se pudo cargar el resumen.';
        this.estado = EstadoVistaPanel.Error;
      }
    });
  }

  // Respuesta al @Output de las tarjetas: bajar hasta la sección pedida
  irASeccion(id: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const seccion = document.getElementById(id);
    seccion?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    seccion?.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------------
  // Ayudas para la plantilla
  // ------------------------------------------------------------------

  get tonoVencidos(): TonoIndicador {
    return (this.resumen?.movimientos.prestamosVencidos ?? 0) > 0 ? TonoIndicador.Peligro : TonoIndicador.Exito;
  }

  get tonoMultas(): TonoIndicador {
    return (this.resumen?.multas.pendientes ?? 0) > 0 ? TonoIndicador.Aviso : TonoIndicador.Exito;
  }

  porcentaje(parte: number, total: number): number {
    return total > 0 ? Math.min(100, Math.round((parte / total) * 100)) : 0;
  }

  plural(n: number, uno: string, varios: string): string {
    return n + ' ' + (n === 1 ? uno : varios);
  }
}
