import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { IActividad } from '../../interfaces/iactividad';
import { ActividadService } from '../../services/actividad.service';

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

  actividades: IActividad[] = [];


  constructor(
    private loginService: LoginService,
    private actividadService: ActividadService
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

        this.actividadService.getActividades().subscribe({ next: (lista: IActividad[]) => this.actividades = lista});
        this.actividades = this.actividades.filter(actividad => ciudadano.actividadesAgendadas.includes(actividad.id))
      }
    }
  }

  // ¿La actividad ya pasó?
  yaPaso(actividad: IActividad): boolean {
    return new Date(actividad.fecha).getTime() <= new Date().getTime();
  }

  cuposDisponibles(actividad: IActividad): number {
    return actividad.capacidad - actividad.inscritos;
  }

  cancelarPlaceholder(actividad: IActividad): void {}

}