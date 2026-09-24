import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ActividadService } from './actividad.service';
import { LoginService } from './login.service';

describe('ActividadService - cancelar inscripción', () => {
  let service: ActividadService;
  let loginService: LoginService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    service = TestBed.inject(ActividadService);
    loginService = TestBed.inject(LoginService);
    loginService.login({ username: 'usuario', password: 'usuario' }).subscribe();
  });

  afterEach(() => sessionStorage.clear());

  it('quita la inscripción propia y libera exactamente un cupo', async () => {
    const ciudadano = loginService.getUsuarioActual()!;
    const inscripciones = ciudadano.actividadesAgendadas;
    const inscritosAntes = service.getActividad(1)!.inscritos;

    const resultado = await firstValueFrom(service.cancelarInscripcion(1));

    expect(resultado.ok).toBeTrue();
    expect(ciudadano.actividadesAgendadas).toEqual([2]);
    expect(ciudadano.actividadesAgendadas).toBe(inscripciones);
    expect(service.getActividad(1)!.inscritos).toBe(inscritosAntes - 1);
  });

  it('no libera otro cupo si se repite la cancelación', async () => {
    await firstValueFrom(service.cancelarInscripcion(1));
    const inscritos = service.getActividad(1)!.inscritos;

    const resultado = await firstValueFrom(service.cancelarInscripcion(1));

    expect(resultado.ok).toBeFalse();
    expect(service.getActividad(1)!.inscritos).toBe(inscritos);
  });

  it('no permite cancelar una inscripción de otro ciudadano', async () => {
    const propietario = loginService.getUsuarioActual()!;
    const inscritos = service.getActividad(1)!.inscritos;
    loginService.login({ username: 'alex', password: 'alex' }).subscribe();

    const resultado = await firstValueFrom(service.cancelarInscripcion(1));

    expect(resultado.ok).toBeFalse();
    expect(propietario.actividadesAgendadas).toContain(1);
    expect(service.getActividad(1)!.inscritos).toBe(inscritos);
  });

  it('rechaza la cancelación si ya no hay sesión', async () => {
    const ciudadano = loginService.getUsuarioActual()!;
    const inscritos = service.getActividad(1)!.inscritos;
    loginService.logout().subscribe();

    const resultado = await firstValueFrom(service.cancelarInscripcion(1));

    expect(resultado.ok).toBeFalse();
    expect(ciudadano.actividadesAgendadas).toContain(1);
    expect(service.getActividad(1)!.inscritos).toBe(inscritos);
  });

  it('no usa la cancelación del ciudadano con una sesión administrativa', async () => {
    loginService.login({ username: 'admin', password: 'admin' }).subscribe();
    const inscritos = service.getActividad(1)!.inscritos;

    const resultado = await firstValueFrom(service.cancelarInscripcion(1));

    expect(resultado.ok).toBeFalse();
    expect(service.getActividad(1)!.inscritos).toBe(inscritos);
  });

  it('conserva las inscripciones si la actividad no existe', async () => {
    const ciudadano = loginService.getUsuarioActual()!;

    const resultado = await firstValueFrom(service.cancelarInscripcion(999));

    expect(resultado.ok).toBeFalse();
    expect(ciudadano.actividadesAgendadas).toEqual([1, 2]);
  });

  it('no deja una ocupación negativa ni borra la inscripción si los datos no coinciden', async () => {
    const actividad = service.getActividad(1)!;
    actividad.inscritos = 0;

    const resultado = await firstValueFrom(service.cancelarInscripcion(1));

    expect(resultado.ok).toBeFalse();
    expect(actividad.inscritos).toBe(0);
    expect(loginService.getUsuarioActual()!.actividadesAgendadas).toContain(1);
  });
});
