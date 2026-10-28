import { Component, ElementRef, Inject, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { IRecurso } from '../../interfaces/irecurso';
import { EstadoVistaReserva, IConfirmarReservaDto, IReserva } from '../../interfaces/ireserva';
import { DIAS_MAXIMOS_RETIRO, MAX_RESERVAS_ACTIVAS, ReservaService } from '../../services/reserva.service';
import { ResumenReservaComponent } from '../resumen-reserva/resumen-reserva.component';

// HU-C05: Confirmar reservas [Ciudadano]
@Component({
  selector: 'app-confirmar-reserva',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ResumenReservaComponent],
  templateUrl: './confirmar-reserva.component.html',
  styleUrl: './confirmar-reserva.component.css'
})
export class ConfirmarReservaComponent implements OnInit {

  // Puente para usar el enum en la plantilla
  Estado = EstadoVistaReserva;
  estado: EstadoVistaReserva = EstadoVistaReserva.Cargando;

  readonly maxReservas = MAX_RESERVAS_ACTIVAS;
  readonly diasRetiro = DIAS_MAXIMOS_RETIRO;

  recursos: IRecurso[] = [];             // selección a confirmar
  reservables: IRecurso[] = [];          // recursos que se pueden agregar
  recursoAAgregar: number | null = null;

  formulario = { fechaRetiro: '', aceptaCondiciones: false };
  fechaMinima = '';
  fechaMaxima = '';

  errores: string[] = [];
  reservasConfirmadas: IReserva[] = [];

  // Caja de avisos: recibe el foco al mostrar errores o éxito (lectores de pantalla)
  @ViewChild('avisos') avisos?: ElementRef<HTMLElement>;

  constructor(
    private reservaService: ReservaService,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;   // la sesión vive en sessionStorage: se carga en el navegador
    }

    const hoy = new Date();
    this.fechaMinima = this.reservaService.fechaLocal(hoy);
    this.fechaMaxima = this.reservaService.fechaLocal(this.reservaService.sumarDias(hoy, DIAS_MAXIMOS_RETIRO));
    this.formulario.fechaRetiro = this.reservaService.fechaLocal(this.reservaService.sumarDias(hoy, 1));

    // Integración con el catálogo: /reservas/confirmar?recurso=4 (o recurso=4,5)
    const parametro = this.route.snapshot.queryParamMap.get('recurso');

    if (parametro) {
      parametro.split(',')
        .map(valor => Number(valor))
        .filter(id => Number.isInteger(id) && id > 0)
        .forEach(id => {
          const result = this.reservaService.agregarASeleccion(id);
          this.errores.push(...result.errors);
        });
    }

    this.cargarSeleccion();
  }


  // ------------------------------------------------------------------
  // Carga de la selección
  // ------------------------------------------------------------------

  cargarSeleccion(): void {
    this.estado = EstadoVistaReserva.Cargando;

    this.reservaService.getResumenSeleccion().subscribe({
      next: (lista) => {
        this.recursos = lista;
        this.actualizarReservables();
        this.estado = lista.length > 0 ? EstadoVistaReserva.Listo : EstadoVistaReserva.Vacio;
      },
      error: () => {
        this.estado = EstadoVistaReserva.Error;
      }
    });
  }

  private actualizarReservables(): void {
    this.reservables = this.reservaService.getRecursosReservables();
    this.recursoAAgregar = null;
  }


  // ------------------------------------------------------------------
  // Editar la selección
  // ------------------------------------------------------------------

  // Evento (@Output) del componente hijo app-resumen-reserva
  quitar(recurso: IRecurso): void {
    this.reservaService.quitarDeSeleccion(recurso.id);
    this.recursos = this.recursos.filter(r => r.id !== recurso.id);
    this.errores = [];
    this.actualizarReservables();

    if (this.recursos.length === 0) {
      this.estado = EstadoVistaReserva.Vacio;
    }
  }

  agregar(): void {
    if (this.recursoAAgregar === null) {
      return;
    }

    const result = this.reservaService.agregarASeleccion(Number(this.recursoAAgregar));
    this.errores = result.errors;
    if (!result.ok) {
      this.enfocarAvisos();
      return;
    }
    this.cargarSeleccion();
  }


  // ------------------------------------------------------------------
  // Confirmar
  // ------------------------------------------------------------------

  confirmar(form: NgForm): void {
    if (this.estado === EstadoVistaReserva.Confirmando) {
      return;   // evita doble envío
    }

    this.errores = [];
    form.control.markAllAsTouched();

    const dto: IConfirmarReservaDto = {
      recursosIds: this.reservaService.getSeleccionIds(),
      fechaRetiro: this.formulario.fechaRetiro,
      aceptaCondiciones: this.formulario.aceptaCondiciones
    };

    this.estado = EstadoVistaReserva.Confirmando;

    this.reservaService.confirmarReservas(dto).subscribe({
      next: (resultado) => {
        if (resultado.ok) {
          this.reservasConfirmadas = resultado.reservas ?? [];
          this.recursos = [];
          this.estado = EstadoVistaReserva.Exito;
        } else {
          this.errores = resultado.errores;
          this.estado = EstadoVistaReserva.Listo;
        }
        this.enfocarAvisos();
      },
      error: () => {
        this.errores = ['No se pudo confirmar la reserva. Inténtalo nuevamente.'];
        this.estado = EstadoVistaReserva.Listo;
        this.enfocarAvisos();
      }
    });
  }

  // Volver a empezar después de una confirmación exitosa
  nuevaReserva(): void {
    this.reservasConfirmadas = [];
    this.formulario.aceptaCondiciones = false;
    this.cargarSeleccion();
  }

  private enfocarAvisos(): void {
    // Esperar a que Angular pinte la caja de avisos
    setTimeout(() => this.avisos?.nativeElement.focus());
  }


  // ------------------------------------------------------------------
  // Apoyo para la plantilla
  // ------------------------------------------------------------------

  get fechaRetiroConfirmada(): string {
    return this.reservasConfirmadas[0]?.fechaRetiro ?? '';
  }

  // 'YYYY-MM-DD' -> Date en hora local (para el pipe date)
  aFecha(valor: string): Date | null {
    if (!valor) return null;
    const [y, m, d] = valor.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
}
