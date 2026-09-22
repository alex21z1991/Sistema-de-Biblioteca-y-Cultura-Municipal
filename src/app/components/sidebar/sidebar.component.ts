import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {

  constructor(private loginService: LoginService) {}

  esAdmin(): boolean {
    const userId = sessionStorage.getItem('userId');
    if (userId) {
      const usuarios = this.loginService.getUsers();
      const ciudadano = usuarios.find(usuario => usuario.id === Number(userId));
      if (ciudadano) {
        return ciudadano.role === 'admin';
      }
    }
    return false;
  }

}
