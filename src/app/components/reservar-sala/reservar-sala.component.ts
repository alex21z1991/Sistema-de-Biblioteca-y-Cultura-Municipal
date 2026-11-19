import { Component, ElementRef, Inject, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  EstadoVistaSala,
  IBloqueHorario,
  IReservaSala,
  IReservaSalaDto,
  ISala
} from '../../interfaces/isala';
import {
  DIAS_ANTICIPACION_SALA,
  DURACION_MAXIMA_SALA,
  HORA_APERTURA_SALAS,
  HORA_CIERRE_SALAS,
  MAX_RESERVAS_SALA_ACTIVAS,
  SalaService
} from '../../services/sala.service';
import { ReservaService } from '../../services/reserva.service';

// HU-C11: Reservar sala de estudio [Ciudadano]
@Component({
  selector: 'app-reservar-sala',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reservar-sala.component.html',
  styleUrl: './reservar-sala.component.css'
})
export class ReservarSalaComponent implements OnInit {

  Estado = EstadoVistaSala;
  estado: EstadoVistaSala = EstadoVistaSala.Cargando;

  readonly diasAnticipacion = DIAS_ANTICIPACION_SALA;
  readonly maxReservas = MAX_RESERVAS_SALA_ACTIVAS;
  readonly apertura = String(HORA_APERTURA_SALAS).padStart(2, '0') + ':00';
  readonly cierre = String(HORA_CIERRE_SALAS).padStart(2, '0') + ':00';
  readonly duraciones: number[] = Array.from({ length: DURACION_MAXIMA_SALA }, (_, i) => i + 1);

  salas: ISala[] = [];
  capacidadMaxima = 0;

  formulario: IReservaSalaDto = { salaId: null, fecha: '', horaInicio: '', duracion: 1, personas: 1 };
  fechaMinima = '';
  fechaMaxima = '';

  // Disponibilidad calculada al cambiar fecha o duración
  bloquesPorSala: Record<number, IBloqueHorario[]> = {};
  horasDisponibles: string[] = [];

  misReservas: IReservaSala[] = [];
  reservaConfirmada?: IReservaSala;
  errores: string[] = [];

  // Caja de avisos
  @ViewChild('avisos') avisos?: ElementRef<HTMLElement>;

  constructor(
    private salaService: SalaService,
    private reservaService: ReservaService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const hoy = new Date();
    this.fechaMinima = this.reservaService.fechaLocal(hoy);
    this.fechaMaxima = this.reservaService.fechaLocal(this.reservaService.sumarDias(hoy, DIAS_ANTICIPACION_SALA));
    this.formulario.fecha = this.reservaService.fechaLocal(this.reservaService.sumarDias(hoy, 1));

    this.cargarSalas();
  }


  // ------------------------------------------------------------------
  // Carga
  // ------------------------------------------------------------------

  cargarSalas(): void {
    this.estado = EstadoVistaSala.Cargando;

    this.salaService.getSalas().subscribe({
      next: (lista) => {
        this.salas = lista;
        this.capacidadMaxima = this.salaService.getCapacidadMaxima();
        this.actualizarDisponibilidad();
        this.cargarMisReservas();
        this.estado = EstadoVistaSala.Listo;
      },
      error: () => {
        this.estado = EstadoVistaSala.Error;
      }
    });
  }

  private cargarMisReservas(): void {
    this.salaService.getMisReservasSala().subscribe(lista => this.misReservas = lista);
  }


  // ------------------------------------------------------------------
  // Cambios en el formulario
  // ------------------------------------------------------------------

  // Fecha o duración cambiaron: recalcular bloques y horas posibles
  actualizarDisponibilidad(): void {
    this.bloquesPorSala = {};

    if (this.formulario.fecha) {
      for (const sala of this.salas) {
        this.bloquesPorSala[sala.id] = this.salaService.getBloques(sala.id, this.formulario.fecha);
      }
    }

    this.actualizarHoras();
  }

  // Si la sala elegida ya no admite a todas las personas, se deselecciona
  cambiarPersonas(): void {
    const sala = this.salaSeleccionada;
    if (sala && Number(this.formulario.personas) > sala.capacidad) {
      this.formulario.salaId = null;
      this.actualizarHoras();
    }
  }

  elegirSala(sala: ISala): void {
    if (!this.admitePersonas(sala) || this.estado === EstadoVistaSala.Reservando) {
      return;
    }
    this.formulario.salaId = sala.id;
    this.errores = [];
    this.actualizarHoras();
  }

  private actualizarHoras(): void {
    this.horasDisponibles = this.formulario.salaId !== null
      ? this.salaService.getHorasInicioDisponibles(this.formulario.salaId, this.formulario.fecha, Number(this.formulario.duracion))
      : [];

    if (!this.horasDisponibles.includes(this.formulario.horaInicio)) {
      this.formulario.horaInicio = '';
    }
  }


  // ------------------------------------------------------------------
  // Reservar
  // ------------------------------------------------------------------

  reservar(form: NgForm): void {
    if (this.estado === EstadoVistaSala.Reservando) {
      return;
    }

    this.errores = [];
    form.control.markAllAsTouched();
    this.estado = EstadoVistaSala.Reservando;

    this.salaService.reservarSala({ ...this.formulario }).subscribe({
      next: (resultado) => {
        if (resultado.ok) {
          this.reservaConfirmada = resultado.reserva;
          this.estado = EstadoVistaSala.Exito;
          this.cargarMisReservas();
        } else {
          this.errores = resultado.errores;
          this.estado = EstadoVistaSala.Listo;
        }
        this.enfocarAvisos();
      },
      error: () => {
        this.errores = ['No se pudo registrar la reserva. Inténtalo nuevamente.'];
        this.estado = EstadoVistaSala.Listo;
        this.enfocarAvisos();
      }
    });
  }

  // Volver al formulario después de una reserva exitosa
  nuevaReserva(): void {
    this.reservaConfirmada = undefined;
    this.formulario = { ...this.formulario, salaId: null, horaInicio: '' };
    this.estado = EstadoVistaSala.Listo;
    this.actualizarDisponibilidad();
  }

  private enfocarAvisos(): void {
    // Esperar a que Angular pinte la caja de avisos
    setTimeout(() => this.avisos?.nativeElement.focus());
  }


  // ------------------------------------------------------------------
  // Apoyo para la plantilla
  // ------------------------------------------------------------------

  get salaSeleccionada(): ISala | undefined {
    return this.salas.find(s => s.id === this.formulario.salaId);
  }

  get horaFin(): string {
    return this.formulario.horaInicio
      ? this.salaService.calcularHoraFin(this.formulario.horaInicio, Number(this.formulario.duracion))
      : '';
  }

  admitePersonas(sala: ISala): boolean {
    return Number(this.formulario.personas) <= sala.capacidad;
  }

  bloquesLibres(sala: ISala): number {
    return (this.bloquesPorSala[sala.id] ?? []).filter(b => b.disponible).length;
  }

  // 'YYYY-MM-DD' -> Date en hora local (para el pipe date)
  aFecha(valor: string): Date | null {
    if (!valor) return null;
    const [y, m, d] = valor.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
}
