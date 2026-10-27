import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IRecurso } from '../../interfaces/irecurso';

// HU-C05: tabla con los recursos que el ciudadano va a reservar.
// Recibe la lista por @Input y avisa al padre cuando se quita uno (@Output).
@Component({
  selector: 'app-resumen-reserva',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resumen-reserva.component.html',
  styleUrl: './resumen-reserva.component.css'
})
export class ResumenReservaComponent {
  @Input() recursos: IRecurso[] = [];
  @Input() bloqueado: boolean = false;   // mientras se confirma no se puede quitar
  @Output() quitar = new EventEmitter<IRecurso>();

  disponibles(recurso: IRecurso): number {
    return Math.max(0, recurso.ejemplares - recurso.ejemplaresComprometidos);
  }

  quitarRecurso(recurso: IRecurso): void {
    this.quitar.emit(recurso);
  }
}
