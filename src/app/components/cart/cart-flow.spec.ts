import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { throwError } from 'rxjs';

import { CatalogoService } from '../../services/catalogo.service';
import { LoginService } from '../../services/login.service';
import { ReservaService } from '../../services/reserva.service';
import { ConfirmarReservaComponent } from '../confirmar-reserva/confirmar-reserva.component';
import { ReservasComponent } from '../reservas/reservas.component';
import { CartComponent } from './cart.component';

describe('Flujo del carrito', () => {
  let reservations: ReservaService;
  let catalog: CatalogoService;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CartComponent, ReservasComponent, ConfirmarReservaComponent],
      providers: [provideRouter([])]
    }).compileComponents();
    TestBed.inject(LoginService).login({ username: 'alex', password: 'alex' }).subscribe();
    reservations = TestBed.inject(ReservaService);
    catalog = TestBed.inject(CatalogoService);
  });

  afterEach(() => sessionStorage.clear());

  function loadCart(): ComponentFixture<CartComponent> {
    const fixture = TestBed.createComponent(CartComponent);
    fixture.detectChanges();
    tick(500);
    fixture.detectChanges();
    return fixture;
  }

  it('la tarjeta agrega al carrito sin hacer una reserva directa', () => {
    const fixture = TestBed.createComponent(ReservasComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const card = Array.from(element.querySelectorAll('app-activity-card'))
      .find(item => item.textContent?.includes('Historia de Arica'))!;
    card.querySelector('button')!.click();
    fixture.detectChanges();

    expect(reservations.getSeleccionIds()).toEqual([5]);
    expect(catalog.getRecurso(5)!.ejemplaresComprometidos).toBe(0);
    expect(card.querySelector('button')!.disabled).toBeTrue();
    expect(card.textContent).toContain('En el carrito');
    expect(element.querySelector('.cart-link')!.textContent).toContain('(1)');
  });

  it('muestra carga, permite quitar y vuelve al estado vacío', fakeAsync(() => {
    reservations.agregarASeleccion(5);
    const fixture = TestBed.createComponent(CartComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Cargando tu carrito');
    tick(500);
    fixture.detectChanges();
    expect(element.querySelector('a[href="/reservas/confirmar"]')).not.toBeNull();

    element.querySelector<HTMLButtonElement>('app-resumen-reserva button')!.click();
    tick(500);
    fixture.detectChanges();
    expect(element.textContent).toContain('Tu carrito está vacío');
    expect(element.querySelector('a[href="/reservas/confirmar"]')).toBeNull();
  }));

  it('mantiene visibles los recursos dados de baja para poder quitarlos', fakeAsync(() => {
    reservations.agregarASeleccion(5);
    catalog.getRecurso(5)!.activo = false;
    const fixture = loadCart();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Historia de Arica');
    expect(element.textContent).toContain('No disponible');
    expect(element.querySelector<HTMLButtonElement>('.cart-actions button')!.disabled).toBeTrue();
  }));

  it('muestra un error de carga y permite reintentar', fakeAsync(() => {
    const load = spyOn(reservations, 'getResumenSeleccion').and.returnValue(throwError(() => new Error('error')));
    const fixture = loadCart();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('No pudimos cargar tu carrito');

    load.and.callThrough();
    element.querySelector<HTMLButtonElement>('button')!.click();
    tick(500);
    fixture.detectChanges();
    expect(element.textContent).toContain('Tu carrito está vacío');
  }));

  it('confirma todos los recursos del carrito con el formulario de HU05', fakeAsync(() => {
    reservations.agregarASeleccion(5);
    reservations.agregarASeleccion(6);
    const fixture = TestBed.createComponent(ConfirmarReservaComponent);
    fixture.detectChanges();
    tick(500);
    fixture.detectChanges();
    tick();
    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    tick(500);
    fixture.detectChanges();
    tick();

    expect(element.textContent).toContain('¡Reserva confirmada!');
    expect(element.querySelectorAll('.tabla-comprobante tbody tr').length).toBe(2);
    expect(reservations.getSeleccionIds()).toEqual([]);
    expect(catalog.getRecurso(5)!.ejemplaresComprometidos).toBe(1);
    expect(catalog.getRecurso(6)!.ejemplaresComprometidos).toBe(1);
  }));
});
