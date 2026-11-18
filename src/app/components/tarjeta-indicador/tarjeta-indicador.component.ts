// HU-A12: tarjeta de indicador reutilizable del panel administrativo
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TonoIndicador } from '../../interfaces/ipanel-admin';

@Component({
  selector: 'app-tarjeta-indicador',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tarjeta-indicador.component.html',
  styleUrl: './tarjeta-indicador.component.css'
})
export class TarjetaIndicadorComponent {

  @Input({ required: true }) etiqueta: string = '';
  @Input({ required: true }) valor: number | string = 0;
  @Input() detalle: string = '';
  @Input() tono: TonoIndicador = TonoIndicador.Normal;

  // Id de la sección del panel que se abre al pulsar la tarjeta
  @Input() seccion: string = '';

  // Avisa al panel qué sección quiere ver el administrador
  @Output() verDetalle = new EventEmitter<string>();

  readonly Tono = TonoIndicador;

  pulsar(): void {
    if (this.seccion) {
      this.verDetalle.emit(this.seccion);
    }
  }
}
