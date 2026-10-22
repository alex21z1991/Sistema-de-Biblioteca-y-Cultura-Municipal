import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FiltrosRecursos {
  texto: string;
  categoria: string;
  disponibilidad: 'todos' | 'disponibles' | 'agotados';
}

@Component({
  selector: 'app-filtrador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filtrador.component.html',
  styleUrl: './filtrador.component.css'
})
export class FiltradorComponent {

  @Input() categorias: string[] = [];

  @Output() filtrosChange = new EventEmitter<FiltrosRecursos>();

  filtros: FiltrosRecursos = {
    texto: '',
    categoria: '',
    disponibilidad: 'todos'
  };

  emitirFiltros(): void {
    this.filtrosChange.emit({ ...this.filtros });
  }

  limpiar(): void {
    this.filtros = {
      texto: '',
      categoria: '',
      disponibilidad: 'todos'
    };

    this.emitirFiltros();
  }
}