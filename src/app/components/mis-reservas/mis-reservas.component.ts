import { Component, ElementRef, EventEmitter, Inject, OnInit, Output, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { combineLatest } from 'rxjs';

import { EstadoReserva, EstadoVistaReserva, IReserva } from '../../interfaces/ireserva';
import { IPrestamo } from '../../interfaces/iprestamo';
import { MAX_RESERVAS_ACTIVAS, ReservaService } from '../../services/reserva.service';
import { PrestamoService } from '../../services/prestamo.service';

// Lo que el ciudadano tiene activo: reservas por retirar y material
// retirado que aún no devuelve (venga de una reserva o de un préstamo directo).
// Lo cancelado o devuelto no se muestra aquí (queda en el Historial).
type EstadoActivo = EstadoReserva.PendienteRetiro | EstadoReserva.Retirada;
type FiltroActivo = 'Todas' | EstadoActivo;

interface IFilaActiva {
  clave: string;
  codigo: string | null;        // comprobante de la reserva (null en préstamo directo)
  tituloRecurso: string;
  fechaSolicitud: string;
  fechaRetiro: string;          // prevista (pendiente) o real (retirada)
  fechaDevolucion?: string;     // solo si ya se retiró
  estado: EstadoActivo;
  reserva?: IReserva;           // solo si está pendiente (se puede cancelar)
}

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

  filas: IFilaActiva[] = [];
  filtro: FiltroActivo = 'Todas';

  // Orden de los filtros
  readonly filtros: FiltroActivo[] = [
    'Todas',
    EstadoReserva.PendienteRetiro,
    EstadoReserva.Retirada
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
    private prestamoService: PrestamoService,
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

    combineLatest([
      this.reservaService.getMisReservas(),
      this.prestamoService.getMisPrestamosActivos()
    ]).subscribe({
      next: ([reservas, prestamos]) => {
        this.filas = this.armarFilas(reservas, prestamos);
        this.estado = this.filas.length > 0 ? EstadoVistaReserva.Listo : EstadoVistaReserva.Vacio;
      },
      error: () => {
        this.estado = EstadoVistaReserva.Error;
      }
    });
  }


  // Pendientes primero (por fecha de retiro), luego lo retirado (por devolución)
  private armarFilas(reservas: IReserva[], prestamos: IPrestamo[]): IFilaActiva[] {

    const pendientes: IFilaActiva[] = reservas
      .filter(r => r.estado === EstadoReserva.PendienteRetiro)
      .sort((a, b) => a.fechaRetiro.localeCompare(b.fechaRetiro))
      .map((r): IFilaActiva => ({
        clave: 'R' + r.id,
        codigo: r.codigo,
        tituloRecurso: r.tituloRecurso,
        fechaSolicitud: r.fechaSolicitud,
        fechaRetiro: r.fechaRetiro,
        estado: EstadoReserva.PendienteRetiro,
        reserva: r
      }));

    const retiradas: IFilaActiva[] = prestamos
      .sort((a, b) => a.fechaDevolucion.localeCompare(b.fechaDevolucion))
      .map((p): IFilaActiva => {
        const reserva = reservas.find(r => r.id === p.reservaId);
        return {
          clave: 'P' + p.id,
          codigo: p.reservaCodigo ?? null,
          tituloRecurso: p.recursoTitulo,
          fechaSolicitud: reserva?.fechaSolicitud ?? p.fechaPrestamo,
          fechaRetiro: p.fechaPrestamo,
          fechaDevolucion: p.fechaDevolucion,
          estado: EstadoReserva.Retirada
        };
      });

    return [...pendientes, ...retiradas];
  }


  // ------------------------------------------------------------------
  // Filtros
  // ------------------------------------------------------------------

  get filasFiltradas(): IFilaActiva[] {
    if (this.filtro === 'Todas') {
      return this.filas;
    }
    return this.filas.filter(f => f.estado === this.filtro);
  }

  contar(filtro: FiltroActivo): number {
    return filtro === 'Todas'
      ? this.filas.length
      : this.filas.filter(f => f.estado === filtro).length;
  }

  etiquetaFiltro(filtro: FiltroActivo): string {
    switch (filtro) {
      case 'Todas': return 'Todas';
      case EstadoReserva.PendienteRetiro: return 'Por retirar';
      case EstadoReserva.Retirada: return 'Retiradas';
    }
  }

  // Ya pasó la fecha de devolución
  devolucionAtrasada(fila: IFilaActiva): boolean {
    return !!fila.fechaDevolucion && fila.fechaDevolucion < this.prestamoService.hoy();
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
  claseEstado(estado: EstadoActivo): string {
    return estado === EstadoReserva.PendienteRetiro ? 'pill--pendiente' : 'pill--retirada';
  }

  // 'YYYY-MM-DD' -> Date en hora local 
  aFecha(valor: string | undefined): Date | null {
    if (!valor) return null;
    const [y, m, d] = valor.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
}
