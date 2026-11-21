import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EstadoReservaSala, IReservaSala, ISala } from '../../interfaces/isala';
import { SalaService } from '../../services/sala.service';

@Component({
  selector: 'app-admin-salas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-salas.component.html',
  styleUrl: './admin-salas.component.css'
})
export class AdminSalasComponent implements OnInit {
  salas: ISala[] = [];
  reservas: IReservaSala[] = [];
  salaSeleccionada: number | null = null;
  mensaje = '';
  error = false;
  EstadoReservaSala = EstadoReservaSala;

  constructor(private salaService: SalaService) {}

  ngOnInit(): void { this.cargarDatos(); }

  cargarDatos(): void {
    this.salaService.getTodasLasSalas().subscribe(salas => this.salas = salas);
    this.salaService.getTodasLasReservasSala().subscribe(reservas => this.reservas = reservas);
  }

  get reservasFiltradas(): IReservaSala[] {
    return this.salaSeleccionada === null ? this.reservas :
      this.reservas.filter(r => r.salaId === this.salaSeleccionada);
  }

  estaVigente(reserva: IReservaSala): boolean {
    if (reserva.estado !== EstadoReservaSala.Confirmada) return false;
    return new Date(`${reserva.fecha}T${reserva.horaFin}:00`).getTime() > Date.now();
  }

  cantidadVigentes(salaId: number): number {
    return this.reservas.filter(r => r.salaId === salaId && this.estaVigente(r)).length;
  }

  cambiarEstado(sala: ISala): void {
    const resultado = this.salaService.cambiarEstadoSala(sala.id, !sala.activa);
    this.mensaje = resultado.mensaje;
    this.error = !resultado.ok;
    if (resultado.ok) this.cargarDatos();
  }
}
