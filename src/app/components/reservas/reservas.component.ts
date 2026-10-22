
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import { ActivityCardComponent } from '../activity-card/activity-card.component';
import { CatalogoService } from '../../services/catalogo.service';
import { LoginService } from '../../services/login.service';
import { IRecurso } from '../../interfaces/irecurso';

import {
  FiltradorComponent,
  FiltrosRecursos
} from '../filtrador/filtrador.component';

@Component({
  selector: 'app-reservas',
  standalone: true,
  imports: [
    CommonModule,
    FiltradorComponent,
    ActivityCardComponent
  ],
  templateUrl: './reservas.component.html',
  styleUrl: './reservas.component.css'
})
export class ReservasComponent implements OnInit {

  recursos: IRecurso[] = [];

  filtros: FiltrosRecursos = {
    texto: '',
    categoria: '',
    disponibilidad: 'todos'
  };

  categorias: string[] = [];
  mensaje = '';
  errores: string[] = [];
  idsReservados: number[] = [];
  esAdmin = false;

  constructor(
    private catalogoService: CatalogoService,
    private loginService: LoginService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.esAdmin = this.loginService.isAdmin();

      const usuario = this.loginService.getUsuarioActual();
      this.idsReservados = [...(usuario?.librosPedidos ?? [])];
    }

    this.cargarRecursos();
  }

  // Cargar los recursos activos publicados en el catálogo.
  cargarRecursos(): void {
    this.catalogoService.getRecursos().subscribe({
      next: (lista) => {
        this.recursos = lista.filter(recurso => recurso.activo);

        this.categorias = [
          ...new Set(
            this.recursos.map(recurso => recurso.categoria)
          )
        ].sort((a, b) =>
          a.localeCompare(b, 'es', { sensitivity: 'base' })
        );
      },
      error: () => {
        this.errores = [
          'No se pudo cargar el catálogo. Inténtalo nuevamente.'
        ];
      }
    });
  }

  // Recibir los filtros del componente filtrador.
  recibirFiltros(filtros: FiltrosRecursos): void {
    this.filtros = filtros;
  }

  // Normalizar texto para ignorar mayúsculas y tildes.
  private normalizar(valor: string): string {
    return (valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es');
  }

  // Filtrar por texto, categoría y disponibilidad.
  get recursosFiltrados(): IRecurso[] {
    const texto = this.normalizar(this.filtros.texto.trim());
    const palabras = texto.split(/\s+/).filter(Boolean);

    return this.recursos.filter(recurso => {
      const contenido = this.normalizar(
        `${recurso.titulo} ${recurso.autor} ${recurso.categoria} ${recurso.tipo}`
      );

      const coincideTexto = palabras.every(
        palabra => contenido.includes(palabra)
      );

      const coincideCategoria =
        !this.filtros.categoria ||
        recurso.categoria === this.filtros.categoria;

      const cantidadDisponible = this.disponibles(recurso);

      const coincideDisponibilidad =
        this.filtros.disponibilidad === 'todos' ||
        (
          this.filtros.disponibilidad === 'disponibles' &&
          cantidadDisponible > 0
        ) ||
        (
          this.filtros.disponibilidad === 'agotados' &&
          cantidadDisponible <= 0
        );

      return coincideTexto &&
        coincideCategoria &&
        coincideDisponibilidad;
    });
  }

  // Calcular cuántos ejemplares quedan disponibles.
  disponibles(recurso: IRecurso): number {
    return Math.max(
      0,
      recurso.ejemplares - recurso.ejemplaresComprometidos
    );
  }

  // Comprobar si el usuario ya reservó este recurso.
  estaReservado(recurso: IRecurso): boolean {
    return this.idsReservados.includes(recurso.id);
  }

  // Obtener los recursos reservados por el usuario actual.
  get misReservas(): IRecurso[] {
    return this.recursos.filter(recurso =>
      this.idsReservados.includes(recurso.id)
    );
  }

  // Registrar una reserva.
 
reservar(recurso: IRecurso): void {
  this.mensaje = '';
  this.errores = [];

  if (this.esAdmin) {
    this.errores = [
      'La cuenta de administrador no puede reservar recursos.'
    ];
    return;
  }

  this.catalogoService.reservarRecurso(recurso.id).subscribe({
    next: (resultado) => {
      if (!resultado.ok) {
        this.errores = resultado.errores;
        return;
      }

      // Actualizar las reservas visibles.
      const usuario = this.loginService.getUsuarioActual();

      this.idsReservados = [
        ...(usuario?.librosPedidos ?? [])
      ];

      this.mensaje =
        `Solicitaste la reserva de “${recurso.titulo}”.`;
    },
    error: () => {
      this.errores = [
        'No se pudo registrar la reserva. Inténtalo nuevamente.'
      ];
    }
  });
}

}
