import { Injectable } from '@angular/core';
import { Observable, combineLatest, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { IHistorial } from '../interfaces/ihistorial';

import {
  EstadoReserva
} from '../interfaces/ireserva';

import {
  EstadoPrestamo
} from '../interfaces/iprestamo';

import { LoginService } from './login.service';
import { ReservaService } from './reserva.service';
import { PrestamoService } from './prestamo.service';

@Injectable({
  providedIn: 'root'
})
export class HistorialService {

  constructor(
    private loginService: LoginService,
    private reservaService: ReservaService,
    private prestamoService: PrestamoService
  ) {}

  // Obtener historial del ciudadano conectado
  getMiHistorial(): Observable<IHistorial[]> {

    const usuario = this.loginService.getUsuarioActual();

    // Verificar sesión y rol
    if (!usuario || usuario.role !== 'usuario') {
      return of([]);
    }

    return combineLatest([
      this.reservaService.getMisReservas(),
      this.prestamoService.getPrestamos()
    ]).pipe(

      map(([reservas, prestamos]) => {

        // Obtener solamente los préstamos del ciudadano
        const misPrestamos = prestamos.filter(
          p => p.usuarioId === usuario.id
        );

        // Convertir préstamos al formato del historial
        const historialPrestamos: IHistorial[] = misPrestamos.map(p => ({

          id: p.id,
          usuarioId: p.usuarioId,
          recursoId: p.recursoId,
          tituloRecurso: p.recursoTitulo,

          fechaMovimiento: p.fechaPrestamo,
          fechaPrestamo: p.fechaPrestamo,
          fechaDevolucion: p.fechaDevolucion,
          fechaDevolucionReal: p.fechaDevolucionReal,

          estado: p.estado === EstadoPrestamo.Devuelto
            ? 'Devuelto'
            : 'Prestado',

          tipo: 'Préstamo'

        }));

        // Convertir reservas al formato del historial
        const historialReservas: IHistorial[] = reservas

          .filter(r => {

            // Si la reserva fue retirada, su préstamo ya aparece
            // en el historial: no duplicarla.
            if (r.estado === EstadoReserva.Retirada) {
              return !misPrestamos.some(p => p.reservaId === r.id);
            }

            return true;
          })

          .map(r => {

            let estado: IHistorial['estado'];

            switch (r.estado) {

              case EstadoReserva.PendienteRetiro:
                estado = 'Reservado';
                break;

              case EstadoReserva.Retirada:
                estado = 'Prestado';
                break;

              case EstadoReserva.Cancelada:
                estado = 'Cancelado';
                break;
            }

            return {

              id: r.id,
              usuarioId: r.usuarioId,
              recursoId: r.recursoId,
              tituloRecurso: r.tituloRecurso,

              fechaMovimiento:
                r.fechaCancelacion || r.fechaSolicitud,

              fechaReserva: r.fechaSolicitud,

              fechaPrestamo:
                r.estado === EstadoReserva.Retirada
                  ? (r.fechaRetiroReal ?? r.fechaRetiro)
                  : undefined,

              estado,
              tipo: 'Reserva' as const

            };
          });

        // Unir reservas y préstamos
        const historial = [
          ...historialReservas,
          ...historialPrestamos
        ];

        // Ordenar por fecha, desde la más reciente
        return historial.sort((a, b) => {

          const comparacion =
            b.fechaMovimiento.localeCompare(a.fechaMovimiento);

          return comparacion !== 0
            ? comparacion
            : b.id - a.id;

        });

      })
    );
  }
}