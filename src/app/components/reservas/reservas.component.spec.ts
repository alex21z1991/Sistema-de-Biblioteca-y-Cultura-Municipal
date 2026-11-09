import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ReservasComponent } from './reservas.component';

describe('ReservasComponent', () => {
  let component: ReservasComponent;
  let fixture: ComponentFixture<ReservasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservasComponent],
      providers: [provideRouter([])]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReservasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
