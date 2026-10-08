import { CommonModule } from '@angular/common';
import { Component, Input, input, Output, EventEmitter } from '@angular/core';
import { IActividad } from '../../interfaces/iactividad';

@Component({
  selector: 'app-activity-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-card.component.html',
  styleUrl: './activity-card.component.css'
})
export class ActivityCardComponent {
  @Input() actividad!: IActividad;
  @Input() yaInscrito: boolean = false;
  @Output() inscribir = new EventEmitter<IActividad>();

  onInscribir(): void{
    this.inscribir.emit(this.actividad);
  }
}
