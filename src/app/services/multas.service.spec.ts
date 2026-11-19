import { TestBed } from '@angular/core/testing';

import { MultasService } from './multas.service';
import { LoginService } from './login.service';
import { TipoMultaSancion } from '../interfaces/imulta-sancion';

describe('MultasService (HU-A06)', () => {
  let service: MultasService;
  let login: LoginService;
  let alexId: number;

  const registrar = (datos: any) => {
    let res: any;
    service.registrar(datos).subscribe(r => (res = r));
    return res;
  };
  const resolver = (op: any) => {
    let res: any;
    op.subscribe((r: any) => (res = r));
    return res;
  };
  const multaDe = (tipo: TipoMultaSancion, monto: number | null = 5000) =>
    registrar({ usuarioId: alexId, tipo, motivo: 'Demora en devolución', monto });

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MultasService);
    login = TestBed.inject(LoginService);
    spyOn(login, 'isAdmin').and.returnValue(true);
    alexId = login.getCiudadanos()[0].id;
  });

  it('registra una multa válida', () => {
    const r = multaDe(TipoMultaSancion.Multa);
    expect(r.ok).toBeTrue();
    expect(r.multa.monto).toBe(5000);
    expect(r.multa.estado).toBe('Pendiente');
  });

  it('rechaza montos inválidos', () => {
    for (const monto of [0, -5, 10.5, 2000000, null]) {
      expect(multaDe(TipoMultaSancion.Multa, monto as any).ok).toBeFalse();
    }
  });

  it('rechaza ciudadano inexistente o vacío', () => {
    expect(registrar({ usuarioId: 99999, tipo: 'Multa', motivo: 'Algo', monto: 1000 }).ok).toBeFalse();
    expect(registrar({ usuarioId: null, tipo: 'Multa', motivo: 'Algo', monto: 1000 }).ok).toBeFalse();
  });

  it('rechaza motivo vacío', () => {
    expect(registrar({ usuarioId: alexId, tipo: 'Multa', motivo: '  ', monto: 1000 }).ok).toBeFalse();
  });

  it('paga una multa y no permite resolverla otra vez', () => {
    const m = multaDe(TipoMultaSancion.Multa).multa;
    expect(resolver(service.pagar(alexId, m.id)).ok).toBeTrue();
    expect(resolver(service.condonar(alexId, m.id)).ok).toBeFalse();
    expect(resolver(service.pagar(alexId, m.id)).errores[0]).toContain('ya fue resuelta');
  });

  it('condona una multa', () => {
    const m = multaDe(TipoMultaSancion.Multa).multa;
    const r = resolver(service.condonar(alexId, m.id));
    expect(r.ok).toBeTrue();
    expect(r.multa.resolucion).toBe('Condonada');
  });

  it('alterna una sanción de ida y vuelta', () => {
    const s = multaDe(TipoMultaSancion.Sancion, null).multa;
    expect(resolver(service.alternarSancion(alexId, s.id)).multa.estado).toBe('Resuelta');
    expect(resolver(service.alternarSancion(alexId, s.id)).multa.estado).toBe('Pendiente');
  });

  it('una sanción no se paga ni condona; una multa no se alterna', () => {
    const s = multaDe(TipoMultaSancion.Sancion, null).multa;
    const m = multaDe(TipoMultaSancion.Multa).multa;
    expect(resolver(service.pagar(alexId, s.id)).ok).toBeFalse();
    expect(resolver(service.alternarSancion(alexId, m.id)).ok).toBeFalse();
  });

  it('resolver libera al ciudadano', () => {
    const user = login.getCiudadanos()[0];
    const antes = service.contarPendientes(user);
    const m = multaDe(TipoMultaSancion.Multa).multa;
    expect(service.contarPendientes(user)).toBe(antes + 1);
    resolver(service.pagar(alexId, m.id));
    expect(service.contarPendientes(user)).toBe(antes);
  });

  it('rechaza si no es administrador', () => {
    (login.isAdmin as jasmine.Spy).and.returnValue(false);
    expect(multaDe(TipoMultaSancion.Multa).ok).toBeFalse();
  });
});
