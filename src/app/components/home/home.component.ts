import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
  actividadPorCancelar: IActividad | null = null;
  errores: string[] = [];
  mensajeExito: string = '';
  cancelando: boolean = false;

  // Llevar el foco a la confirmación cuando aparece
  @ViewChild('confirmacion')
  set confirmacion(elemento: ElementRef<HTMLDivElement> | undefined) {
    elemento?.nativeElement.focus();
  }


  constructor(
    private loginService: LoginService,
    private actividadService: ActividadService
  ) {}


  ngOnInit(): void {
    this.cargarResumen();
  }

  cargarResumen(): void {
    const ciudadano = this.loginService.getUsuarioActual();

    if (!ciudadano) {
      this.usuario = '';
      this.librosPedidos = 0;
      this.salasPedidas = 0;
      this.actividadesAgendadas = 0;
      this.multas = 0;
      this.actividades = [];
      return;
    }

    this.usuario = ciudadano.username;
    this.librosPedidos = ciudadano.librosPedidos.length;
    this.salasPedidas = ciudadano.salasPedidas.length;
    this.actividadesAgendadas = ciudadano.actividadesAgendadas.length;
    this.multas = ciudadano.multas.length;

    // Mostrar solamente las actividades del ciudadano
    this.actividadService.getActividades().subscribe({
      next: (lista: IActividad[]) => {
        this.actividades = lista.filter(actividad => ciudadano.actividadesAgendadas.includes(actividad.id));
      },
      error: () => this.errores = ['No se pudieron cargar tus actividades.']
    });
  }

  // ¿La actividad ya pasó?
  yaPaso(actividad: IActividad): boolean {
    return new Date(actividad.fecha).getTime() <= new Date().getTime();
  }

  cuposDisponibles(actividad: IActividad): number {
    return actividad.capacidad - actividad.inscritos;
  }

  solicitarCancelacion(actividad: IActividad): void {
    this.actividadPorCancelar = actividad;
    this.errores = [];
    this.mensajeExito = '';
  }

  mantenerInscripcion(): void {
    this.actividadPorCancelar = null;
  }

  confirmarCancelacion(): void {
    if (!this.actividadPorCancelar || this.cancelando) {
      return;
    }

    const actividad = this.actividadPorCancelar;
    this.cancelando = true;
    this.errores = [];

    this.actividadService.cancelarInscripcion(actividad.id).subscribe({
      next: (resultado) => {
        this.cancelando = false;
        this.actividadPorCancelar = null;

        if (resultado.ok) {
          this.mensajeExito = 'Cancelaste tu inscripción en "' + actividad.titulo + '". Se liberó un cupo.';
        } else {
          this.errores = resultado.errores;
        }

        // Actualizar el listado y los contadores del inicio
        this.cargarResumen();
      },
      error: () => {
        this.cancelando = false;
        this.errores = ['No se pudo cancelar la inscripción. Inténtalo nuevamente.'];
      }
    });
  }

}
