import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IPrestamo } from '../../interfaces/iprestamo';
import { PrestamoService } from '../../services/prestamo.service';

// HU-A05: el administrador registra la devolución de un préstamo
// (directo o nacido de una reserva). La lógica vive en PrestamoService.
@Component({
  selector: 'app-admin-devolucion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-devolucion.component.html',
  styleUrls: ['./admin-devolucion.component.css']
})
export class AdminDevolucionComponent implements OnInit {
  prestamos: IPrestamo[] = [];
  busqueda = '';
  mensaje = '';
  mensajeEsExito = false;

  constructor(private prestamoService: PrestamoService) {}

  ngOnInit(): void { this.obtenerPrestamos(); }

  obtenerPrestamos(): void {
    this.prestamoService.getPrestamos().subscribe(lista => this.prestamos = lista);
  }

  get prestamosFiltrados(): IPrestamo[] {
    const texto = this.busqueda.toLowerCase().trim();
    return this.prestamos.filter(p =>
      p.usuarioNombre.toLowerCase().includes(texto) ||
      p.recursoTitulo.toLowerCase().includes(texto) ||
      p.id.toString().includes(texto) ||
      (p.reservaCodigo ?? '').toLowerCase().includes(texto)
    );
  }

  devolverLibro(id: number): void {
    this.mensaje = this.prestamoService.registrarDevolucion(id);
    this.mensajeEsExito = this.mensaje.startsWith('Devolución registrada');
    this.obtenerPrestamos();
  }
}
