import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {

  // Nombre del usuario que inició sesión
  usuario: string = '';

  // Cantidad de libros pedidos
  librosPedidos: number = 0;
  salasPedidas: number = 0;
  actividadesAgendadas: number = 0;
  multas: number = 0;


  constructor(
    private loginService: LoginService
  ) {}


  ngOnInit(): void {

    // Obtener el ID del ciudadano que inició sesión
    const userId = sessionStorage.getItem('userId');

    // Verificar que exista una sesión
    if (userId) {

      // Obtener los usuarios desde el LoginService
      const usuarios = this.loginService.getUsers();

      // Buscar solamente al ciudadano que inició sesión
      const ciudadano = usuarios.find(
        usuario => usuario.id === Number(userId)
      );

      // Si encontramos al ciudadano
      if (ciudadano) {

        this.usuario = ciudadano.username;

        this.librosPedidos = ciudadano.librosPedidos.length;
        this.salasPedidas = ciudadano.salasPedidas.length;
        this.actividadesAgendadas =ciudadano.actividadesAgendadas.length;
        this.multas = ciudadano.multas.length;
      }
    }
  }
}