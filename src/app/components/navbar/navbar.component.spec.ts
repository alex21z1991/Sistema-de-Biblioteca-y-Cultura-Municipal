import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NavbarComponent } from './navbar.component';
import { LoginService } from '../../services/login.service';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([])]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('links citizens to home and keeps pending departments inactive', () => {
    const navbar: HTMLElement = fixture.nativeElement;
    const links = Array.from(navbar.querySelectorAll('nav a'));

    expect(links.find(link => link.textContent?.trim() === 'Inicio')?.getAttribute('href')).toBe('/home');
    expect(links.some(link => link.textContent?.trim() === 'Administración')).toBeFalse();
    expect(navbar.querySelectorAll('nav span.proximamente[title="Próximamente"]').length).toBe(4);
  });

  it('shows the administration link for administrators', () => {
    spyOn(TestBed.inject(LoginService), 'isAdmin').and.returnValue(true);
    fixture.detectChanges();

    const navbar: HTMLElement = fixture.nativeElement;
    const adminLink = navbar.querySelector('nav a[href="/admin-panel"]');
    expect(adminLink?.textContent?.trim()).toBe('Administración');
  });
});
