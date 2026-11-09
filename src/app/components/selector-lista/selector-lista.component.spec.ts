import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectorListaComponent } from './selector-lista.component';

describe('SelectorListaComponent', () => {
  let fixture: ComponentFixture<SelectorListaComponent>;
  let component: SelectorListaComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SelectorListaComponent] }).compileComponents();

    fixture = TestBed.createComponent(SelectorListaComponent);
    component = fixture.componentInstance;
    component.opciones = [
      { valor: 'a', etiqueta: 'Alfa', grupo: 'G1' },
      { valor: 'b', etiqueta: 'Beta', grupo: 'G1', deshabilitada: true },
      { valor: 'c', etiqueta: 'Gamma', grupo: 'G2' }
    ];
    component.ngOnChanges();
    fixture.detectChanges();
  });

  it('muestra el texto de ayuda sin selección', () => {
    expect(fixture.nativeElement.querySelector('.selector__texto').textContent).toContain('Selecciona');
  });

  it('elige una opción y avisa el cambio', () => {
    let recibido: any;
    component.registerOnChange(v => recibido = v);

    component.alternar();
    component.elegir(component.opciones[2]);

    expect(recibido).toBe('c');
    expect(component.abierto).toBeFalse();
  });

  it('no permite elegir una opción deshabilitada', () => {
    let recibido: any = 'nada';
    component.registerOnChange(v => recibido = v);

    component.elegir(component.opciones[1]);

    expect(recibido).toBe('nada');
  });

  it('filtra con el buscador sin distinguir tildes', () => {
    component.alternar();
    component.alEscribir('GAMMA');

    expect(component.filas.filter(f => f.opcion).length).toBe(1);
  });
});
