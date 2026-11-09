import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  readonly departamentosPendientes = [
    'Espacios públicos',
    'Permisos y patentes',
    'Pagos municipales',
    'Reclamos'
  ];

  constructor(private loginService: LoginService, private router: Router) {}

  get esAdmin(): boolean {
    return this.loginService.isAdmin();
  }

  get nombreUsuario(): string {
    return this.loginService.getUsuarioActual()?.username ?? 'Usuario';
  }

  get iniciales(): string {
    const partes = this.nombreUsuario.trim().split(/\s+/);
    const letras = partes.length > 1
      ? partes.slice(0, 2).map(parte => parte.charAt(0)).join('')
      : partes[0].slice(0, 2);
    return letras.toUpperCase();
  }

  get bibliotecaActiva(): boolean {
    return ['/explorar', '/reservas', '/carrito'].some(ruta => this.router.isActive(ruta, false));
  }

  get administracionActiva(): boolean {
    return ['/admin-panel', '/admin-catalogo', '/admin-prestamos', '/admin-devoluciones']
      .some(ruta => this.router.isActive(ruta, false));
  }

  cerrarMenuFuera(evento: Event, menu: HTMLDetailsElement): void {
    if (menu.open && evento.target instanceof Node && !menu.contains(evento.target)) {
      menu.open = false;
    }
  }

  cerrarMenuConEscape(menu: HTMLDetailsElement, control: HTMLElement): void {
    if (menu.open) {
      menu.open = false;
      control.focus();
    }
  }

  cerrarSesion(): void {
    this.loginService.logout().subscribe({
      next: () => this.router.navigate(['/login'])
    });
  }
}
