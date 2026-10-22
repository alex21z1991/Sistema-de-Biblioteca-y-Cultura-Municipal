
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

import { IActividad } from '../../interfaces/iactividad';
import { IRecurso } from '../../interfaces/irecurso';
import { formatearDuracion, horaFin } from '../../data/listas';

@Component({
  selector: 'app-activity-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-card.component.html',
  styleUrl: './activity-card.component.css'
})
export class ActivityCardComponent {

  // Seleccionar si la tarjeta muestra una actividad o un libro.
  @Input() modo: 'actividad' | 'libro' = 'actividad';

  @Input() esAdmin = false;

  // Datos de actividades.
  @Input() actividad!: IActividad;
  @Input() yaInscrito = false;

  @Output() inscribir = new EventEmitter<IActividad>();

  // Datos de recursos del catálogo.
  @Input() recurso: IRecurso | null = null;
  @Input() yaReservado = false;

  @Output() reservarRecurso = new EventEmitter<IRecurso>();

  // Texto de duración para las actividades.
  get duracionTexto(): string {
    if (!this.actividad) {
      return '';
    }

    return formatearDuracion(this.actividad.duracion)
      + ' (hasta las '
      + horaFin(
          this.actividad.fecha,
          this.actividad.duracion
        )
      + ')';
  }

  // Calcular cupos disponibles de una actividad.
  get cuposDisponibles(): number {
    if (!this.actividad) {
      return 0;
    }

    return Math.max(
      0,
      this.actividad.capacidad - this.actividad.inscritos.length
    );
  }

  // Inscribirse en una actividad.
  onInscribir(): void {
    if (
      this.modo === 'actividad' &&
      this.actividad &&
      this.cuposDisponibles > 0 &&
      !this.yaInscrito
    ) {
      this.inscribir.emit(this.actividad);
    }
  }

  // Calcular los ejemplares disponibles de un recurso.
  disponibles(recurso: IRecurso): number {
    return Math.max(
      0,
      recurso.ejemplares - recurso.ejemplaresComprometidos
    );
  }

  // Solicitar la reserva desde la tarjeta.
  onReservar(): void {
    if (
      this.modo === 'libro' &&
      this.recurso &&
      !this.esAdmin &&
      !this.yaReservado &&
      this.disponibles(this.recurso) > 0
    ) {
      this.reservarRecurso.emit(this.recurso);
    }
  }
}
