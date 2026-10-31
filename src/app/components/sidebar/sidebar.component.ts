import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { ReservaService } from '../../services/reserva.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  esAdmin: boolean = false;
  isCitizen = false;
  readonly cartIds$ = this.reservaService.seleccion$;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private reservaService: ReservaService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.esAdmin = this.loginService.isAdmin();
      this.isCitizen = this.loginService.getRole() === 'usuario';
    }
  }

  cerrarSesion(): void {
    this.loginService.logout().subscribe({
      next: () => this.router.navigate(['/login'])
    });
  }
}
