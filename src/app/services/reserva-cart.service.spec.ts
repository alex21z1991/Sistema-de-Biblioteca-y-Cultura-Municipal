import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import {
  EstadoReserva,
  IResultadoEntrega,
  IReserva,
  IResultadoReserva
} from '../interfaces/ireserva';
import { CatalogoService } from './catalogo.service';
import { LoginService } from './login.service';
import { ReservaService } from './reserva.service';

describe('Carrito de recursos', () => {
  let login: LoginService;
  let catalog: CatalogoService;
  let reservations: ReservaService;

  function signIn(username: string): void {
    login.login({ username, password: username }).subscribe();
  }

  function confirm(): IResultadoReserva | undefined {
    let result: IResultadoReserva | undefined;
    reservations.confirmarReservas({
      recursosIds: reservations.getSeleccionIds(),
      fechaRetiro: reservations.fechaLocal(new Date()),
      aceptaCondiciones: true
    }).subscribe(value => result = value);
    tick(500);
    return result;
  }

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    login = TestBed.inject(LoginService);
    catalog = TestBed.inject(CatalogoService);
    reservations = TestBed.inject(ReservaService);
    signIn('alex');
  });

  afterEach(() => sessionStorage.clear());

  it('agrega y quita sin reservar ejemplares ni duplicar recursos', () => {
    const orders = [...login.getUsuarioActual()!.librosPedidos];
    expect(reservations.agregarASeleccion(5).ok).toBeTrue();
    expect(reservations.agregarASeleccion(5).ok).toBeFalse();
    expect(reservations.getSeleccionIds()).toEqual([5]);
    expect(catalog.getRecurso(5)!.ejemplaresComprometidos).toBe(0);
    expect(login.getUsuarioActual()!.librosPedidos).toEqual(orders);
    reservations.getMisReservas().subscribe(list => expect(list).toEqual([]));

    reservations.quitarDeSeleccion(5);
    expect(reservations.getSeleccionIds()).toEqual([]);
    expect(catalog.getRecurso(5)!.ejemplaresComprometidos).toBe(0);
  });

  it('rechaza recursos inexistentes, inactivos, agotados o ya reservados', () => {
    for (const id of [999, 3, 7, 1]) {
      expect(reservations.agregarASeleccion(id).ok).toBeFalse();
    }
    expect(reservations.getSeleccionIds()).toEqual([]);
  });

  it('solo permite agregar recursos a un ciudadano con sesión', () => {
    login.logout().subscribe();
    expect(reservations.agregarASeleccion(5).ok).toBeFalse();
    signIn('admin');
    expect(reservations.agregarASeleccion(5).ok).toBeFalse();
    expect(reservations.getSeleccionIds()).toEqual([]);
  });

  it('mantiene separado el carrito y el contador de cada cuenta', () => {
    let visibleIds: number[] = [];
    const subscription = reservations.seleccion$.subscribe(ids => visibleIds = ids);
    reservations.agregarASeleccion(5);
    expect(visibleIds).toEqual([5]);

    login.logout().subscribe();
    expect(visibleIds).toEqual([]);
    signIn('usuario');
    reservations.agregarASeleccion(6);
    expect(visibleIds).toEqual([6]);
    signIn('admin');
    expect(visibleIds).toEqual([]);
    reservations.limpiarSeleccion();
    signIn('alex');
    expect(visibleIds).toEqual([5]);
    reservations.quitarDeSeleccion(5);
    signIn('usuario');
    expect(visibleIds).toEqual([6]);
    subscription.unsubscribe();
  });

  it('no permite modificar el carrito desde una copia de sus IDs', () => {
    reservations.agregarASeleccion(5);
    reservations.getSeleccionIds().push(6);
    const subscription = reservations.seleccion$.subscribe(ids => ids.push(7));
    expect(reservations.getSeleccionIds()).toEqual([5]);
    subscription.unsubscribe();
  });

  it('confirma el conjunto en HU05 y limpia solo el carrito del ciudadano actual', fakeAsync(() => {
    signIn('usuario');
    reservations.agregarASeleccion(2);
    signIn('alex');
    reservations.agregarASeleccion(5);
    reservations.agregarASeleccion(6);

    const result = confirm();
    expect(result?.ok).toBeTrue();
    expect(result?.reservas?.map(reservation => reservation.recursoId)).toEqual([5, 6]);
    expect(result?.reservas?.every(reservation => reservation.usuarioId === 3)).toBeTrue();
    expect(catalog.getRecurso(5)!.ejemplaresComprometidos).toBe(1);
    expect(catalog.getRecurso(6)!.ejemplaresComprometidos).toBe(1);
    expect(reservations.getSeleccionIds()).toEqual([]);
    reservations.getMisReservas().subscribe(list => expect(list.length).toBe(2));

    signIn('usuario');
    expect(reservations.getSeleccionIds()).toEqual([2]);
  }));

  it('conserva toda la selección si un recurso se agota antes de confirmar', fakeAsync(() => {
    reservations.agregarASeleccion(5);
    reservations.agregarASeleccion(6);
    catalog.getRecurso(6)!.ejemplaresComprometidos = 3;

    expect(confirm()?.ok).toBeFalse();
    expect(reservations.getSeleccionIds()).toEqual([5, 6]);
    expect(catalog.getRecurso(5)!.ejemplaresComprometidos).toBe(0);
    expect(login.getUsuarioActual()!.librosPedidos).toEqual([1, 2, 4]);
    reservations.getMisReservas().subscribe(list => expect(list).toEqual([]));
  }));

  it('conserva el carrito cuando HU05 rechaza las multas o el límite de reservas', fakeAsync(() => {
    signIn('usuario');
    reservations.agregarASeleccion(5);
    expect(confirm()?.ok).toBeFalse();
    expect(reservations.getSeleccionIds()).toEqual([5]);

    signIn('alex');
    reservations.agregarASeleccion(5);
    reservations.agregarASeleccion(6);
    login.getUsuarioActual()!.librosPedidos.push(7);
    expect(confirm()?.ok).toBeFalse();
    expect(reservations.getSeleccionIds()).toEqual([5, 6]);
    expect(catalog.getRecurso(5)!.ejemplaresComprometidos).toBe(0);
  }));

  it('avisa las multas y el exceso del límite antes de confirmar', () => {
    reservations.agregarASeleccion(5);
    reservations.agregarASeleccion(6);
    expect(reservations.getCartWarnings()).toEqual([]);

    login.getUsuarioActual()!.librosPedidos.push(7);
    expect(reservations.getCartWarnings()).toEqual([jasmine.stringContaining('Quita 1 recurso(s) del carrito')]);

    signIn('usuario');
    reservations.agregarASeleccion(5);
    expect(reservations.getCartWarnings()).toEqual([jasmine.stringContaining('1 multa(s) pendiente(s)')]);

    signIn('admin');
    expect(reservations.getCartWarnings()).toEqual([]);
  });

  it('HU-A04 convierte una reserva lista en un préstamo activo para el administrador', fakeAsync(() => {
    reservations.agregarASeleccion(5);
    const confirmacion = confirm();
    const reserva = confirmacion?.reservas?.[0];

    expect(confirmacion?.ok).toBeTrue();
    expect(reserva?.estado).toBe(EstadoReserva.PendienteRetiro);

    signIn('admin');

    let pendientes: IReserva[] = [];
    reservations.getReservasPendientes().subscribe(list => pendientes = list);
    expect(pendientes.length).toBe(1);
    expect(pendientes[0].id).toBe(reserva!.id);

    let entrega: IResultadoEntrega | undefined;
    reservations.entregarReservas(
      [reserva!.id],
      reservations.fechaLocal(reservations.sumarDias(new Date(), 7))
    ).subscribe(resultado => entrega = resultado);

    expect(entrega?.ok).toBeTrue();
    expect(entrega?.prestamos?.length).toBe(1);
    expect(entrega?.prestamos?.[0].origen).toBe('reserva');
    expect(entrega?.prestamos?.[0].reservaId).toBe(reserva!.id);
    expect(entrega?.prestamos?.[0].activo).toBeTrue();

    signIn('alex');
    reservations.getMisReservas().subscribe(list => {
      expect(list[0].estado).toBe(EstadoReserva.Retirada);
    });
  }));

  it('HU-A04 rechaza la entrega si la sesión no es administrativa', fakeAsync(() => {
    reservations.agregarASeleccion(5);
    const confirmacion = confirm();

    let resultado: IResultadoEntrega | undefined;
    reservations.entregarReservas(
      [confirmacion!.reservas![0].id],
      reservations.fechaLocal(new Date())
    ).subscribe(value => resultado = value);

    expect(resultado?.ok).toBeFalse();
    expect(resultado?.errores[0]).toContain('administrador');
  }));
});
