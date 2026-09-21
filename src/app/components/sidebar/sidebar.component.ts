import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {

  constructor(
    private loginService: LoginService,
    private router: Router
  ) {}

  cerrarSesion(): void {

    this.loginService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      }
    });
  }
}
