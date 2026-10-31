import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IDevolucion } from '../../interfaces/idevolucion';
import { DevolucionService } from '../../services/devolucion.service';

@Component({
  selector: 'app-admin-devolucion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-devolucion.component.html',
  styleUrls: ['./admin-devolucion.component.css']
})
export class AdminDevolucionComponent implements OnInit {
  prestamos: IDevolucion[] = [];
  busqueda = '';
  mensaje = '';

  constructor(private devoluciones: DevolucionService) {}

  ngOnInit(): void { this.obtenerPrestamos(); }

  obtenerPrestamos(): void {
    this.prestamos = this.devoluciones.obtenerPrestamos();
  }

  get prestamosFiltrados(): IDevolucion[] {
    const texto = this.busqueda.toLowerCase().trim();
    return this.prestamos.filter(p =>
      p.usuario.toLowerCase().includes(texto) ||
      p.titulo.toLowerCase().includes(texto) ||
      p.id.toString().includes(texto)
    );
  }

  devolverLibro(id: number): void {
    this.mensaje = this.devoluciones.devolverLibro(id);
    this.obtenerPrestamos();
  }
}
