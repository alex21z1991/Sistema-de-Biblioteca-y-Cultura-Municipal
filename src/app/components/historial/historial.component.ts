import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HistorialService } from '../../services/historial.service';
import {
  IHistorial,
  EstadoHistorial
} from '../../interfaces/ihistorial';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.css'
})
export class HistorialComponent implements OnInit {

  historial: IHistorial[] = [];

  filtro: 'Todos' | EstadoHistorial = 'Todos';

  cargando = true;
  error = '';

  readonly filtros: ('Todos' | EstadoHistorial)[] = [
    'Todos',
    'Reservado',
    'Prestado',
    'Devuelto',
    'Cancelado'
  ];

  constructor(
    private historialService: HistorialService
  ) {}

  ngOnInit(): void {
    this.cargarHistorial();
  }

  // Cargar movimientos del ciudadano
  cargarHistorial(): void {

    this.cargando = true;
    this.error = '';

    this.historialService.getMiHistorial().subscribe({

      next: (datos) => {
        this.historial = datos;
        this.cargando = false;
      },

      error: (err) => {
        console.error('Error al cargar historial:', err);
        this.error = 'No se pudo cargar el historial.';
        this.cargando = false;
      }

    });
  }

  // Filtrar movimientos por estado
  get historialFiltrado(): IHistorial[] {

    if (this.filtro === 'Todos') {
      return this.historial;
    }

    return this.historial.filter(
      movimiento => movimiento.estado === this.filtro
    );
  }

  // Contar movimientos
  contar(estado: 'Todos' | EstadoHistorial): number {

    if (estado === 'Todos') {
      return this.historial.length;
    }

    return this.historial.filter(
      movimiento => movimiento.estado === estado
    ).length;
  }

  // Seleccionar filtro
  seleccionarFiltro(
    estado: 'Todos' | EstadoHistorial
  ): void {

    this.filtro = estado;
  }

  // Obtener clase del estado
  claseEstado(estado: EstadoHistorial): string {

    switch (estado) {

      case 'Reservado':
        return 'estado-reservado';

      case 'Prestado':
        return 'estado-prestado';

      case 'Devuelto':
        return 'estado-devuelto';

      case 'Cancelado':
        return 'estado-cancelado';

    }
  }

  // Formatear fecha YYYY-MM-DD a DD/MM/YYYY
  formatearFecha(fecha?: string): string {

    if (!fecha) {
      return 'No registrada';
    }

    const partes = fecha.split('-');

    if (partes.length !== 3) {
      return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
}