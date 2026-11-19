import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminMultasComponent } from './admin-multas.component';

describe('AdminMultasComponent', () => {
  let component: AdminMultasComponent;
  let fixture: ComponentFixture<AdminMultasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminMultasComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminMultasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filtra por estado', () => {
    component.cargar();
    component.filtro = 'resueltas';
    expect(component.filasFiltradas.every(f => f.multa.estado === 'Resuelta')).toBeTrue();
  });
});
