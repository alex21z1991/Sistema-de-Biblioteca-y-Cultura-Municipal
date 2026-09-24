import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ActividadService } from '../../services/actividad.service';
import { LoginService } from '../../services/login.service';
import { IActividad, IActividadForm } from '../../interfaces/iactividad';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.css'
})
export class AdminPanelComponent implements OnInit {

  // Cartelera publicada
  actividades: IActividad[] = [];

  // Datos del formulario
  formulario: IActividadForm = this.formularioVacio();

  // null = creando | número = editando esa actividad
  idEnEdicion: number | null = null;

  // Mensajes para el administrador
  errores: string[] = [];
  mensajeExito: string = '';

  // Mínimos para los inputs
  fechaMinima: string = '';
  capacidadMinima: number = 1;

  // Precondición: sesión administrativa
  esAdmin: boolean = false;


  constructor(
    private actividadService: ActividadService,
    private loginService: LoginService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}


  ngOnInit(): void {

    // sessionStorage solo existe en el navegador (el proyecto usa SSR)
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.esAdmin = this.loginService.isAdmin();
    this.fechaMinima = this.ahoraEnTexto();

    this.cargarActividades();
  }


  // ------------------------------------------------------------------
  // Cartelera
  // ------------------------------------------------------------------

  cargarActividades(): void {
    this.actividadService.getActividades().subscribe({
      next: (lista: IActividad[]) => this.actividades = lista,
      error: (err) => {
        console.error('Error al cargar la cartelera:', err);
        this.errores = ['No se pudo cargar la cartelera.'];
      }
    });
  }


  // ------------------------------------------------------------------
  // Guardar (crea o edita según el modo)
  // ------------------------------------------------------------------

  guardar(): void {

    this.errores = [];
    this.mensajeExito = '';

    // Modo edición
    if (this.idEnEdicion !== null) {

      this.actividadService
        .actualizarActividad(this.idEnEdicion, this.formulario)
        .subscribe({
          next: (resultado) => {

            if (resultado.ok) {
              this.mensajeExito = 'Actividad actualizada en la cartelera.';
              this.cancelarEdicion();
              this.cargarActividades();
            } else {
              this.errores = resultado.errores;
            }
          },
          error: (err) => {
            console.error('Error al actualizar:', err);
            this.errores = ['Ocurrió un error inesperado al guardar.'];
          }
        });

      return;
    }

    // Modo creación
    this.actividadService
      .crearActividad(this.formulario)
      .subscribe({
        next: (resultado) => {

          if (resultado.ok) {
            this.mensajeExito = 'Actividad publicada en la cartelera.';
            this.formulario = this.formularioVacio();
            this.capacidadMinima = 1;
            this.cargarActividades();
          } else {
            this.errores = resultado.errores;
          }
        },
        error: (err) => {
          console.error('Error al crear:', err);
          this.errores = ['Ocurrió un error inesperado al guardar.'];
        }
      });
  }


  // ------------------------------------------------------------------
  // Edición
  // ------------------------------------------------------------------

  editar(actividad: IActividad): void {

    this.idEnEdicion = actividad.id;
    this.errores = [];
    this.mensajeExito = '';

    // Copia de los datos para no modificar la cartelera antes de guardar
    this.formulario = {
      titulo: actividad.titulo,
      tipo: actividad.tipo,
      lugar: actividad.lugar,
      descripcion: actividad.descripcion,
      fecha: actividad.fecha,
      capacidad: actividad.capacidad
    };

    // La capacidad no puede bajar de las inscripciones existentes
    this.capacidadMinima = actividad.inscritos > 0 ? actividad.inscritos : 1;
  }


  cancelarEdicion(): void {
    this.idEnEdicion = null;
    this.formulario = this.formularioVacio();
    this.capacidadMinima = 1;
    this.errores = [];
  }


  // ------------------------------------------------------------------
  // Demo: sumar una inscripción para probar la regla de capacidad
  // ------------------------------------------------------------------

  inscribir(actividad: IActividad): void {

    this.errores = [];
    this.mensajeExito = '';

    this.actividadService.inscribir(actividad.id).subscribe({
      next: (resultado) => {

        if (resultado.ok) {
          this.mensajeExito = 'Inscripción registrada en "' + actividad.titulo + '".';
          this.cargarActividades();
        } else {
          this.errores = resultado.errores;
        }
      }
    });
  }


  // ------------------------------------------------------------------
  // HU-A09: Controlar inscripciones
  // Quitar una inscripción y liberar el cupo
  // ------------------------------------------------------------------

  quitarInscripcion(actividad: IActividad): void {

    this.errores = [];
    this.mensajeExito = '';

    this.actividadService.quitarInscripcion(actividad.id).subscribe({
      next: (resultado) => {

        if (resultado.ok) {
          this.mensajeExito = 'Se quitó una inscripción de "' + actividad.titulo + '" y se liberó el cupo.';
          this.cargarActividades();
        } else {
          this.errores = resultado.errores;
        }
      }
    });
  }


  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------

  // ¿La actividad ya pasó?
  yaPaso(actividad: IActividad): boolean {
    return new Date(actividad.fecha).getTime() <= new Date().getTime();
  }

  cuposDisponibles(actividad: IActividad): number {
    return actividad.capacidad - actividad.inscritos;
  }

  private formularioVacio(): IActividadForm {
    return {
      titulo: '',
      tipo: 'Taller',
      lugar: '',
      descripcion: '',
      fecha: '',
      capacidad: 1
    };
  }

  // Fecha y hora actual en formato 'YYYY-MM-DDTHH:mm' (hora local)
  private ahoraEnTexto(): string {

    const ahora = new Date();
    ahora.setSeconds(0, 0);

    const desfase = ahora.getTimezoneOffset() * 60000;

    return new Date(ahora.getTime() - desfase)
      .toISOString()
      .slice(0, 16);
  }
}
