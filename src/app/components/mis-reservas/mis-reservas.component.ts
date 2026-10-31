import { Component, ElementRef, EventEmitter, Inject, OnInit, Output, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import { EstadoReserva, EstadoVistaReserva, FiltroReserva, IReserva } from '../../interfaces/ireserva';
import { MAX_RESERVAS_ACTIVAS, ReservaService } from '../../services/reserva.service';

// HU-C06: Consultar o cancelar una reserva [Ciudadano]
// Se muestra como la sección "Mis reservas" de la página de Reservas.
@Component({
  selector: 'app-mis-reservas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-reservas.component.html',
  styleUrl: './mis-reservas.component.css'
})
export class MisReservasComponent implements OnInit {

  // Puentes para usar los enums en la plantilla
  Estado = EstadoVistaReserva;
  EstadoReserva = EstadoReserva;

  estado: EstadoVistaReserva = EstadoVistaReserva.Cargando;
  readonly maxReservas = MAX_RESERVAS_ACTIVAS;

  reservas: IReserva[] = [];
  filtro: FiltroReserva = 'Todas';

  // Orden de los filtros
  readonly filtros: FiltroReserva[] = [
    'Todas',
    EstadoReserva.PendienteRetiro,
    EstadoReserva.Retirada,
    EstadoReserva.Cancelada
  ];

  reservaPorCancelar: IReserva | null = null;
  cancelando = false;
  mensajeExito = '';
  errores: string[] = [];

  // Llevar el foco a la confirmación cuando aparece
  @ViewChild('confirmacion')
  set confirmacion(elemento: ElementRef<HTMLDivElement> | undefined) {
    elemento?.nativeElement.focus();
  }

  // Avisa a la página para que actualice la disponibilidad del catálogo
  @Output() reservaCancelada = new EventEmitter<IReserva>();

  // Caja de avisos: recibe el foco al mostrar el resultado
  @ViewChild('avisos') avisos?: ElementRef<HTMLElement>;

  constructor(
    private reservaService: ReservaService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.cargarReservas();
  }


  // ------------------------------------------------------------------
  // Carga
  // ------------------------------------------------------------------

  cargarReservas(): void {
    this.estado = EstadoVistaReserva.Cargando;

    this.reservaService.getMisReservas().subscribe({
      next: (lista) => {
        this.reservas = lista;
        this.estado = lista.length > 0 ? EstadoVistaReserva.Listo : EstadoVistaReserva.Vacio;
      },
      error: () => {
        this.estado = EstadoVistaReserva.Error;
      }
    });
  }


  // ------------------------------------------------------------------
  // Filtros
  // ------------------------------------------------------------------

  get reservasFiltradas(): IReserva[] {
    if (this.filtro === 'Todas') {
      return this.reservas;
    }
    return this.reservas.filter(r => r.estado === this.filtro);
  }

  contar(filtro: FiltroReserva): number {
    return filtro === 'Todas'
      ? this.reservas.length
      : this.reservas.filter(r => r.estado === filtro).length;
  }

  // Reservas que todavía ocupan un cupo (pendientes de retiro)
  get activas(): number {
    return this.reservas.filter(r => this.puedeCancelar(r)).length;
  }

  etiquetaFiltro(filtro: FiltroReserva): string {
    switch (filtro) {
      case 'Todas': return 'Todas';
      case EstadoReserva.PendienteRetiro: return 'Pendientes de retiro';
      case EstadoReserva.Retirada: return 'Retiradas';
      case EstadoReserva.Cancelada: return 'Canceladas';
    }
  }


  // ------------------------------------------------------------------
  // Cancelar
  // ------------------------------------------------------------------

  puedeCancelar(reserva: IReserva): boolean {
    return this.reservaService.puedeCancelar(reserva);
  }

  solicitarCancelacion(reserva: IReserva): void {
    this.reservaPorCancelar = reserva;
    this.errores = [];
    this.mensajeExito = '';
  }

  mantenerReserva(): void {
    this.reservaPorCancelar = null;
  }

  confirmarCancelacion(): void {
    if (!this.reservaPorCancelar || this.cancelando) {
      return;   // evita doble envío
    }

    const reserva = this.reservaPorCancelar;
    this.cancelando = true;
    this.errores = [];

    this.reservaService.cancelarReserva(reserva.id).subscribe({
      next: (resultado) => {
        this.cancelando = false;
        this.reservaPorCancelar = null;

        if (resultado.ok) {
          this.mensajeExito = 'Cancelaste la reserva ' + reserva.codigo + ' de "' + reserva.tituloRecurso +
            '". El ejemplar quedó disponible para otros ciudadanos.';
          this.reservaCancelada.emit(reserva);
        } else {
          this.errores = resultado.errores;
        }

        this.cargarReservas();
        this.enfocarAvisos();
      },
      error: () => {
        this.cancelando = false;
        this.errores = ['No se pudo cancelar la reserva. Inténtalo nuevamente.'];
        this.enfocarAvisos();
      }
    });
  }

  private enfocarAvisos(): void {
    // Esperar a que Angular pinte la caja de avisos
    setTimeout(() => this.avisos?.nativeElement.focus());
  }


  // ------------------------------------------------------------------
  // Apoyo para la plantilla
  // ------------------------------------------------------------------

  // Clase de la pastilla de estado
  claseEstado(estado: EstadoReserva): string {
    switch (estado) {
      case EstadoReserva.PendienteRetiro: return 'pill--pendiente';
      case EstadoReserva.Retirada: return 'pill--retirada';
      case EstadoReserva.Cancelada: return 'pill--cancelada';
    }
  }

  // 'YYYY-MM-DD' -> Date en hora local 
  aFecha(valor: string | undefined): Date | null {
    if (!valor) return null;
    const [y, m, d] = valor.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
}
