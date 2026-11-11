import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EstadoMultaSancion, TipoMultaSancion } from '../../interfaces/imulta-sancion';
import { LoginService } from '../../services/login.service';
import { PrestamoService } from '../../services/prestamo.service';
import { ReservaService } from '../../services/reserva.service';
import { MultasComponent } from './multas.component';

describe('Consulta de multas y sanciones', () => {
  let login: LoginService;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [MultasComponent],
      providers: [provideRouter([])]
    }).compileComponents();
    login = TestBed.inject(LoginService);
  });

  afterEach(() => sessionStorage.clear());

  it('muestra solo los registros del ciudadano en sesión', () => {
    login.login({ username: 'usuario', password: 'usuario' }).subscribe();
    const fixture = TestBed.createComponent(MultasComponent);
    const view: HTMLElement = fixture.nativeElement;
    fixture.detectChanges();

    expect(view.textContent).toContain('Demora en la entrega');
    expect(view.textContent).toContain('Pendiente');

    login.logout().subscribe();
    login.login({ username: 'alex', password: 'alex' }).subscribe();
    fixture.detectChanges();

    expect(view.textContent).not.toContain('Demora en la entrega');
    expect(view.textContent).toContain('No tienes multas ni sanciones registradas');
  });

  it('bloquea con multas o sanciones pendientes y, al resolverlas, las conserva visibles sin bloquear', () => {
    login.login({ username: 'usuario', password: 'usuario' }).subscribe();
    const ciudadano = login.getUsuarioActual()!;
    const reservas = TestBed.inject(ReservaService);
    const prestamos = TestBed.inject(PrestamoService);
    const solicitud = {
      recursosIds: [5],
      fechaRetiro: reservas.fechaLocal(new Date()),
      aceptaCondiciones: true
    };

    expect(reservas.getCartWarnings().length).toBe(1);
    expect(reservas.validar(solicitud).length).toBe(1);
    expect(prestamos.estadoCiudadano(ciudadano).ok).toBeFalse();

    ciudadano.multas.push({
      id: 2,
      tipo: TipoMultaSancion.Sancion,
      motivo: 'Sanción de ejemplo',
      fecha: '2026-11-08',
      estado: EstadoMultaSancion.Pendiente
    });

    expect(reservas.getCartWarnings()).toEqual([jasmine.stringContaining('2 multas o sanciones pendientes')]);

    ciudadano.multas[0].estado = EstadoMultaSancion.Resuelta;

    expect(reservas.getCartWarnings()).toEqual([jasmine.stringContaining('1 multa o sanción pendiente')]);
    expect(reservas.validar(solicitud)).toEqual([jasmine.stringContaining('1 multa o sanción pendiente')]);
    expect(prestamos.estadoCiudadano(ciudadano)).toEqual({ ok: false, motivo: 'Tiene 1 multa o sanción pendiente' });

    ciudadano.multas[1].estado = EstadoMultaSancion.Resuelta;

    expect(reservas.getCartWarnings()).toEqual([]);
    expect(reservas.validar(solicitud)).toEqual([]);
    expect(prestamos.estadoCiudadano(ciudadano).ok).toBeTrue();

    const fixture = TestBed.createComponent(MultasComponent);
    fixture.detectChanges();
    const view: HTMLElement = fixture.nativeElement;
    expect(view.textContent).toContain('Demora en la entrega');
    expect(view.textContent).toContain('Resuelta');
    expect(view.textContent).toContain('Sanción de ejemplo');
    expect(view.querySelector('time')?.textContent).toBe('08/11/2026');
  });
});
