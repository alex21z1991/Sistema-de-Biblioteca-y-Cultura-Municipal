import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PanelAdminService } from './panel-admin.service';
import { LoginService } from './login.service';
import { EstadoActividad, TipoActividad } from '../interfaces/iactividad';
import { EstadoPrestamo } from '../interfaces/iprestamo';
import { EstadoReserva } from '../interfaces/ireserva';
import { EstadoReservaSala } from '../interfaces/isala';
import { TipoMovimiento, TonoIndicador } from '../interfaces/ipanel-admin';

describe('PanelAdminService (HU-A12)', () => {
  let service: PanelAdminService;
  const hoy = '2026-11-18';
  const ahora = new Date(2026, 10, 18, 12, 0);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    service = TestBed.inject(PanelAdminService);
  });

  it('rechaza la consulta si no hay sesión de administrador', (done) => {
    spyOn(TestBed.inject(LoginService), 'isAdmin').and.returnValue(false);
    service.getResumen().subscribe({
      next: () => fail('no debería entregar datos'),
      error: (err: Error) => {
        expect(err.message).toContain('administrador');
        done();
      }
    });
  });

  it('resume recursos, movimientos, actividades y salas', () => {
    const r = service.construirResumen({
      recursos: [
        { id: 1, titulo: 'A', autor: '', categoria: '', tipo: '', ejemplares: 3, ejemplaresComprometidos: 1, activo: true },
        { id: 2, titulo: 'B', autor: '', categoria: '', tipo: '', ejemplares: 1, ejemplaresComprometidos: 1, activo: true },
        { id: 3, titulo: 'C', autor: '', categoria: '', tipo: '', ejemplares: 5, ejemplaresComprometidos: 0, activo: false }
      ],
      prestamos: [
        { id: 1, usuarioId: 2, usuarioNombre: 'usuario', recursoId: 1, recursoTitulo: 'A', fechaPrestamo: '2026-11-01', fechaDevolucion: '2026-11-10', estado: EstadoPrestamo.Prestado },
        { id: 2, usuarioId: 3, usuarioNombre: 'alex', recursoId: 2, recursoTitulo: 'B', fechaPrestamo: '2026-11-15', fechaDevolucion: '2026-11-29', estado: EstadoPrestamo.Prestado },
        { id: 3, usuarioId: 3, usuarioNombre: 'alex', recursoId: 1, recursoTitulo: 'A', fechaPrestamo: '2026-11-02', fechaDevolucion: '2026-11-09', fechaDevolucionReal: '2026-11-12', estado: EstadoPrestamo.Devuelto }
      ],
      reservas: [
        { id: 1, codigo: 'RES-0001', usuarioId: 3, recursoId: 1, tituloRecurso: 'A', fechaSolicitud: '2026-11-17', fechaRetiro: hoy, estado: EstadoReserva.PendienteRetiro }
      ],
      actividades: [
        { id: 1, titulo: 'Taller', tipo: TipoActividad.Taller, lugar: 'Sala', descripcion: '', fecha: '2026-11-20T10:00', duracion: 60, capacidad: 2, inscritos: [2, 3], estado: EstadoActividad.Activa },
        { id: 2, titulo: 'Evento', tipo: TipoActividad.Evento, lugar: 'Teatro', descripcion: '', fecha: '2026-11-25T18:00', duracion: 90, capacidad: 8, inscritos: [], estado: EstadoActividad.Activa },
        { id: 3, titulo: 'Pasado', tipo: TipoActividad.Evento, lugar: 'Teatro', descripcion: '', fecha: '2026-11-01T18:00', duracion: 90, capacidad: 8, inscritos: [], estado: EstadoActividad.Activa }
      ],
      salas: [
        { id: 1, nombre: 'S1', ubicacion: '', capacidad: 4, equipamiento: [], activa: true },
        { id: 2, nombre: 'S2', ubicacion: '', capacidad: 4, equipamiento: [], activa: false }
      ],
      reservasSala: [
        { id: 1, codigo: 'SAL-0001', usuarioId: 2, salaId: 1, nombreSala: 'S1', fecha: hoy, horaInicio: '10:00', horaFin: '11:00', personas: 2, fechaSolicitud: hoy, estado: EstadoReservaSala.Confirmada },
        { id: 2, codigo: 'SAL-0002', usuarioId: 2, salaId: 1, nombreSala: 'S1', fecha: '2026-11-10', horaInicio: '10:00', horaFin: '11:00', personas: 2, fechaSolicitud: hoy, estado: EstadoReservaSala.Confirmada }
      ]
    }, hoy, ahora);

    expect(r.recursos).toEqual({ total: 3, activos: 2, dadosDeBaja: 1, ejemplares: 4, ejemplaresDisponibles: 2, sinStock: 1 });

    expect(r.movimientos.prestamosActivos).toBe(2);
    expect(r.movimientos.prestamosVencidos).toBe(1);
    expect(r.movimientos.devoluciones).toBe(1);
    expect(r.movimientos.retirosHoy).toBe(1);
    expect(r.movimientos.recientes[0].tipo).toBe(TipoMovimiento.Reserva);
    expect(r.movimientos.recientes[0].usuario).toBe('alex');

    expect(r.actividades.proximas).toBe(2);
    expect(r.actividades.llenas).toBe(1);
    expect(r.actividades.ocupacion).toBe(20);   // 2 de 10 cupos

    expect(r.salas.reservasHoy).toBe(1);
    expect(r.salas.reservasProximas).toBe(1);   // la del 10/11 ya pasó
    expect(r.salas.enMantencion).toBe(1);

    // El usuario de prueba tiene una multa pendiente
    expect(r.multas.ciudadanosConPendientes).toContain('usuario');

    // La alerta más urgente va primero
    expect(r.alertas[0].tono).toBe(TonoIndicador.Peligro);
  });
});
