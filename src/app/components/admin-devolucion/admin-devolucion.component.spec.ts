import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminDevolucionComponent } from './admin-devolucion.component';

describe('AdminDevolucionComponent', () => {
  let component: AdminDevolucionComponent;
  let fixture: ComponentFixture<AdminDevolucionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDevolucionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdminDevolucionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
