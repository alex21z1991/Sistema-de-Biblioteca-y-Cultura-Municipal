
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ActivityCardComponent } from '../activity-card/activity-card.component';
import { MisReservasComponent } from '../mis-reservas/mis-reservas.component';
import { CatalogoService } from '../../services/catalogo.service';
import { LoginService } from '../../services/login.service';
import { ReservaService } from '../../services/reserva.service';
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
    RouterLink,
    FiltradorComponent,
    ActivityCardComponent,
    MisReservasComponent
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
  readonly cartIds$ = this.reservaService.seleccion$;

  constructor(
    private catalogoService: CatalogoService,
    private loginService: LoginService,
    private reservaService: ReservaService,
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

  // HU-C06: al cancelar, el recurso vuelve a estar disponible en el catálogo.
  alCancelarReserva(): void {
    const usuario = this.loginService.getUsuarioActual();
    this.idsReservados = [...(usuario?.librosPedidos ?? [])];
    this.cargarRecursos();
  }

  addToCart(resource: IRecurso): void {
    const result = this.reservaService.agregarASeleccion(resource.id);
    this.errores = result.errors;
    this.mensaje = result.ok ? `Agregaste “${resource.titulo}” al carrito.` : '';
  }

}
