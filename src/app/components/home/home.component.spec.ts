import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { throwError } from 'rxjs';

import { HomeComponent } from './home.component';
import { ActividadService } from '../../services/actividad.service';
import { LoginService } from '../../services/login.service';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let actividadService: ActividadService;
  let loginService: LoginService;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([])]
    })
    .compileComponents();
    
    loginService = TestBed.inject(LoginService);
    actividadService = TestBed.inject(ActividadService);
    loginService.login({ username: 'usuario', password: 'usuario' }).subscribe();
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => sessionStorage.clear());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('mantiene la inscripción si el ciudadano descarta la confirmación', () => {
    const actividad = component.actividades[0];
    const inscritos = actividad.inscritos;

    component.solicitarCancelacion(actividad);
    expect(component.actividadesAgendadas).toBe(2);
    component.mantenerInscripcion();

    expect(component.actividadPorCancelar).toBeNull();
    expect(component.actividadesAgendadas).toBe(2);
    expect(actividad.inscritos).toBe(inscritos);
  });

  it('actualiza el listado y los contadores después de confirmar', () => {
    const actividad = component.actividades[0];
    const inscritos = actividad.inscritos;

    component.solicitarCancelacion(actividad);
    component.confirmarCancelacion();
    fixture.detectChanges();

    expect(component.actividades.map(item => item.id)).toEqual([2]);
    expect(component.actividadesAgendadas).toBe(1);
    expect(actividad.inscritos).toBe(inscritos - 1);
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Cancelaste tu inscripción');
  });

  it('muestra el estado vacío y la confirmación al cancelar la última inscripción', () => {
    loginService.login({ username: 'alex', password: 'alex' }).subscribe();
    const ciudadano = loginService.getUsuarioActual()!;
    ciudadano.librosPedidos = [];
    ciudadano.salasPedidas = [];
    ciudadano.actividadesAgendadas.push(1);
    actividadService.inscribir(1).subscribe();
    component.cargarResumen();

    component.solicitarCancelacion(component.actividades[0]);
    component.confirmarCancelacion();
    fixture.detectChanges();

    expect(component.actividadesAgendadas).toBe(0);
    expect(component.actividades).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No tienes movimientos registrados');
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
  });

  it('muestra el error sin quitar la inscripción si falla el servicio', () => {
    spyOn(actividadService, 'cancelarInscripcion').and.returnValue(throwError(() => new Error('Error de prueba')));
    component.solicitarCancelacion(component.actividades[0]);

    component.confirmarCancelacion();
    fixture.detectChanges();

    expect(component.cancelando).toBeFalse();
    expect(component.actividadesAgendadas).toBe(2);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('No se pudo cancelar');
  });
});
