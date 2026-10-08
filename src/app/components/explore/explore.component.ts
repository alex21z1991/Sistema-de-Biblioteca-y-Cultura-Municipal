import { Component } from '@angular/core';
import { IActividad } from '../../interfaces/iactividad';
import { ActividadService } from '../../services/actividad.service';
import { CommonModule } from '@angular/common';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.css'
})
export class ExploreComponent {
  actividades: IActividad[] = [];
  actividadesAgendadas: number[] = [];
  filtroTipo: 'Todos' | 'Taller' | 'Evento' = 'Todos';

  error: string = '';
  mensajeExito: string = '';

  constructor(private actividadService: ActividadService, private loginService: LoginService) {}

  ngOnInit(): void {
    this.cargarActividades();

    // Obtener el ID del ciudadano que inició sesión
    const userId = sessionStorage.getItem('userId');

    // Verificar que exista una sesión
    if (userId) {
      // Obtener los usuarios desde el LoginService
      const usuarios = this.loginService.getUsers();

      // Buscar solamente al ciudadano que inició sesión
      const ciudadano = usuarios.find(usuario => usuario.id === Number(userId));

      // Si encontramos al ciudadano
      if (ciudadano) {
        // Obtener las actividades agendadas por el ciudadano
        this.actividadesAgendadas = ciudadano.actividadesAgendadas
      }
    }

  }

  cargarActividades(): void {
    this.actividadService.getActividades().subscribe({
      next: (lista: IActividad[]) => (this.actividades = lista),
      error: (err) => console.error('Error fetching activities', err)
    });
  }

  get actividadesFiltradas(): IActividad[] {
    if (this.filtroTipo === 'Todos') {
      return this.actividades;
    }
    return this.actividades.filter(a => a.tipo === this.filtroTipo);
  }

  inscribir(actividad: IActividad): void {
    // IMPLEMENTAR SISTEMA DE NOTIFICACIONES PARA ERRORES Y MENSAJES DE EXITO

    this.error = '';
    this.mensajeExito = '';

    this.actividadService.inscribir(actividad.id).subscribe({
      next: (resultado) => {

        if (resultado.ok) {
          this.mensajeExito = 'Te has registrado en "' + actividad.titulo + '".';
          this.actividadesAgendadas.push(actividad.id);
          this.cargarActividades();
        } else {
          this.error = resultado.errores[0];
        }
      }
    });
  }

  estaInscrito(actividad: IActividad): boolean {
    return this.actividadesAgendadas.includes(actividad.id);
  }
}
