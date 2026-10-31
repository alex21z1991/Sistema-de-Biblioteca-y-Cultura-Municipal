import { Injectable } from '@angular/core';
import { IDevolucion } from '../interfaces/idevolucion';
import { PrestamoService } from './prestamo.service';

@Injectable({ providedIn: 'root' })
export class DevolucionService {
  constructor(private prestamosService: PrestamoService) {}

  obtenerPrestamos(): IDevolucion[] {
    let lista: IDevolucion[] = [];
    // getPrestamos() emite sincrónicamente mediante of() en esta versión del proyecto.
    this.prestamosService.getPrestamos().subscribe(prestamos => {
      lista = prestamos.map(p => ({
        id: p.id,
        usuario: p.usuarioNombre,
        recursoId: p.recursoId,
        titulo: p.recursoTitulo,
        fechaPrestamo: p.fechaPrestamo,
        estado: p.estado
      }));
    });
    return lista;
  }

  devolverLibro(id: number): string {
    return this.prestamosService.registrarDevolucion(id);
  }
}
