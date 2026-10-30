import { Injectable } from '@angular/core';
import { IDevolucion } from '../interfaces/idevolucion';
import { CatalogoService } from './catalogo.service';
import { LoginService } from './login.service';

@Injectable({ providedIn: 'root' })
export class DevolucionService {
  // cada préstamo corresponde a una copia ya comprometida en el catálogo base.
  private prestamos: IDevolucion[] = [
    { id: 1, usuario: 'Usuario de prueba', recursoId: 1, titulo: 'Cien años de soledad', fechaPrestamo: '2026-10-20', estado: 'Prestado' },
    { id: 2, usuario: 'Usuario de prueba', recursoId: 4, titulo: 'Subterra', fechaPrestamo: '2026-10-21', estado: 'Prestado' }
  ];

  constructor(private catalogo: CatalogoService, private login: LoginService) {}

  obtenerPrestamos(): IDevolucion[] {
    return this.prestamos.map(prestamo => ({ ...prestamo }));
  }

  devolverLibro(id: number): string {
    if (!this.login.isAdmin()) return 'Solo el administrador puede registrar devoluciones.';

    const prestamo = this.prestamos.find(p => p.id === id);
    if (!prestamo) return 'El préstamo no existe.';
    if (prestamo.estado === 'Devuelto') return 'Este libro ya fue devuelto.';
    if (!this.catalogo.liberarEjemplar(prestamo.recursoId)) return 'No se pudo liberar el ejemplar.';

    prestamo.estado = 'Devuelto';
    prestamo.fechaDevolucion = new Date().toLocaleDateString('en-CA');
    return 'Devolución registrada correctamente.';
  }
}
