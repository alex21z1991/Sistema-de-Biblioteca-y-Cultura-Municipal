import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { ReservaService } from '../../services/reserva.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  @Input() seccion: 'biblioteca' | 'administracion' = 'biblioteca';
  readonly cartIds$ = this.reservaService.seleccion$;

  constructor(
    private loginService: LoginService,
    private reservaService: ReservaService
  ) {}

  get isCitizen(): boolean {
    return this.loginService.getRole() === 'usuario';
  }
}
