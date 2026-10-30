import { TestBed } from '@angular/core/testing';

import { PrestamoService } from './prestamo.service';
import { CatalogoService } from './catalogo.service';
import { LoginService } from './login.service';

describe('PrestamoService (HU-A03)', () => {
  let service: PrestamoService;
  let catalogo: CatalogoService;
  let login: LoginService;

  const ALEX = 3;     // habilitado y sin multas
  const USUARIO = 2;  // con multas pendientes

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrestamoService);
    catalogo = TestBed.inject(CatalogoService);
    login = TestBed.inject(LoginService);
    spyOn(login, 'isAdmin').and.returnValue(true);
  });

  function recursoDisponible(): number {
    let id = -1;
    catalogo.getRecursos().subscribe(lista => {
      id = lista.find(r => service.estadoRecurso(r).ok)!.id;
    });
    return id;
  }

  function devolucion(dias: number): string {
    return service.sumarDias(service.hoy(), dias);
  }

  it('registra un préstamo válido con estado Prestado', () => {
    const recursoId = recursoDisponible();
    let resultado: any;

    service.registrarPrestamo({ usuarioId: ALEX, recursoId, fechaDevolucion: devolucion(14) })
      .subscribe(r => resultado = r);

    expect(resultado.ok).toBeTrue();
    expect(resultado.prestamo.estado).toBe('Prestado');
  });

  it('descuenta un ejemplar disponible', () => {
    const recursoId = recursoDisponible();
    const antes = catalogo.getRecurso(recursoId)!.ejemplaresComprometidos;

    service.registrarPrestamo({ usuarioId: ALEX, recursoId, fechaDevolucion: devolucion(7) }).subscribe();

    expect(catalogo.getRecurso(recursoId)!.ejemplaresComprometidos).toBe(antes + 1);
  });

  it('rechaza a un ciudadano con multas pendientes', () => {
    const errores = service.validar({ usuarioId: USUARIO, recursoId: recursoDisponible(), fechaDevolucion: devolucion(7) });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza a un ciudadano inhabilitado', () => {
    login.getUsers().find(u => u.id === ALEX)!.habilitado = false;
    const errores = service.validar({ usuarioId: ALEX, recursoId: recursoDisponible(), fechaDevolucion: devolucion(7) });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('exige ciudadano y recurso', () => {
    const errores = service.validar({ usuarioId: null, recursoId: null, fechaDevolucion: devolucion(7) });
    expect(errores.length).toBe(2);
  });

  it('rechaza fechas pasadas y de más de 30 días', () => {
    const recursoId = recursoDisponible();
    expect(service.validar({ usuarioId: ALEX, recursoId, fechaDevolucion: service.hoy() }).length).toBeGreaterThan(0);
    expect(service.validar({ usuarioId: ALEX, recursoId, fechaDevolucion: devolucion(31) }).length).toBeGreaterThan(0);
    expect(service.validar({ usuarioId: ALEX, recursoId, fechaDevolucion: devolucion(30) }).length).toBe(0);
  });

  it('no permite el mismo recurso dos veces al mismo ciudadano', () => {
    const recursoId = recursoDisponible();
    service.registrarPrestamo({ usuarioId: ALEX, recursoId, fechaDevolucion: devolucion(7) }).subscribe();

    expect(service.validar({ usuarioId: ALEX, recursoId, fechaDevolucion: devolucion(7) }).length).toBeGreaterThan(0);
  });

  it('no registra nada si no hay sesión de administrador', () => {
    (login.isAdmin as jasmine.Spy).and.returnValue(false);
    let resultado: any;

    service.registrarPrestamo({ usuarioId: ALEX, recursoId: recursoDisponible(), fechaDevolucion: devolucion(7) })
      .subscribe(r => resultado = r);

    expect(resultado.ok).toBeFalse();
  });
});
