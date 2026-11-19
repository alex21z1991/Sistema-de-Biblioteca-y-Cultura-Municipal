import { AsyncPipe, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoMultaSancion, formatearMonto } from '../../interfaces/imulta-sancion';
import { MultasService } from '../../services/multas.service';

@Component({
  selector: 'app-multas',
  standalone: true,
  imports: [AsyncPipe, DatePipe, RouterLink],
  templateUrl: './multas.component.html',
  styleUrl: './multas.component.css'
})
export class MultasComponent {
  readonly multas$ = this.multasService.misMultas$;
  readonly pendiente = EstadoMultaSancion.Pendiente;
  readonly formatearMonto = formatearMonto;

  constructor(private multasService: MultasService) {}
}
