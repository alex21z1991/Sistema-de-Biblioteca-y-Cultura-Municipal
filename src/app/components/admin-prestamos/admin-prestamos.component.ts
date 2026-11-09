import { Component, HostListener, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CatalogoService } from '../../services/catalogo.service';
import { LoginService } from '../../services/login.service';
import { PrestamoService } from '../../services/prestamo.service';

import { IEstadoPrestamo, IPrestamo, DIAS_PRESTAMO_MAXIMO, DIAS_PRESTAMO_POR_DEFECTO } from '../../interfaces/iprestamo';
import { IRecurso } from '../../interfaces/irecurso';
import { IUser } from '../../interfaces/iuser';
import { ISelectorOpcion, SelectorListaComponent } from '../selector-lista/selector-lista.component';

interface DiaCalendario {
  numero: number;
  iso: string;
  delMes: boolean;
  deshabilitado: boolean;
  esHoy: boolean;
}

// HU-A03: el administrador registra un préstamo directo (sin reserva previa)
@Component({
  selector: 'app-admin-prestamos',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectorListaComponent],
  templateUrl: './admin-prestamos.component.html',
  styleUrl: './admin-prestamos.component.css'
})
export class AdminPrestamosComponent implements OnInit {

  // Precondición: sesión administrativa
  esAdmin: boolean = false;

  ciudadanos: IUser[] = [];
  opcionesCiudadano: ISelectorOpcion[] = [];
  recursos: IRecurso[] = [];
  prestamos: IPrestamo[] = [];

  // Datos del formulario
  usuarioId: number | null = null;
  recursoId: number | null = null;
  fechaDevolucion: string = '';
  busqueda: string = '';

  // Mensajes para el administrador
  errores: string[] = [];
  mensajeExito: string = '';

  // Límites de la fecha de devolución
  fechaMinima: string = '';
  fechaMaxima: string = '';
  readonly diasRapidos: number[] = [7, 14, 21, 30];
  readonly diasMaximo = DIAS_PRESTAMO_MAXIMO;

  // Calendario desplegable (mismo estilo que el de la cartelera)
  calendarioAbierto: boolean = false;
  mesVisible: Date = new Date();
  readonly diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  constructor(
    private prestamoService: PrestamoService,
    private catalogoService: CatalogoService,
    private loginService: LoginService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}


  ngOnInit(): void {

    // sessionStorage solo existe en el navegador (el proyecto usa SSR)
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.esAdmin = this.loginService.isAdmin();

    const hoy = this.prestamoService.hoy();
    this.fechaMinima = this.prestamoService.sumarDias(hoy, 1);
    this.fechaMaxima = this.prestamoService.sumarDias(hoy, DIAS_PRESTAMO_MAXIMO);
    this.fechaDevolucion = this.prestamoService.sumarDias(hoy, DIAS_PRESTAMO_POR_DEFECTO);
    this.mesVisible = this.primerDiaDelMes(this.fechaDevolucion);

    this.cargar();
  }

  // Cierra el calendario al hacer clic fuera de él
  @HostListener('document:click', ['$event'])
  alClickDocumento(event: MouseEvent): void {
    if (!(event.target as HTMLElement).closest('.selector-fecha-wrapper')) {
      this.calendarioAbierto = false;
    }
  }

  cargar(): void {
    this.ciudadanos = this.loginService.getCiudadanos();
    this.opcionesCiudadano = this.ciudadanos.map(c => {
      const estado = this.prestamoService.estadoCiudadano(c);
      return {
        valor: c.id,
        etiqueta: c.username,
        detalle: estado.ok ? undefined : estado.motivo,
        deshabilitada: !estado.ok
      };
    });
    this.catalogoService.getRecursos().subscribe(lista => this.recursos = lista);
    this.prestamoService.getPrestamos().subscribe(lista => this.prestamos = lista);
  }


  // ------------------------------------------------------------------
  // Paso 1: ciudadano
  // ------------------------------------------------------------------

  get ciudadanoElegido(): IUser | undefined {
    return this.ciudadanos.find(c => c.id === this.usuarioId);
  }

  estadoCiudadano(ciudadano: IUser): IEstadoPrestamo {
    return this.prestamoService.estadoCiudadano(ciudadano);
  }

  prestamosActivos(ciudadano: IUser): number {
    return this.prestamoService.prestamosActivosDe(ciudadano.id).length;
  }


  // ------------------------------------------------------------------
  // Paso 2: recurso
  // ------------------------------------------------------------------

  get recursoElegido(): IRecurso | undefined {
    return this.recursos.find(r => r.id === this.recursoId);
  }

  // Búsqueda sin distinguir mayúsculas ni tildes
  get recursosFiltrados(): IRecurso[] {
    const palabras = this.normalizar(this.busqueda).split(/\s+/).filter(Boolean);

    return this.recursos.filter(r => {
      const texto = this.normalizar(`${r.titulo} ${r.autor} ${r.categoria} ${r.tipo}`);
      return palabras.every(p => texto.includes(p));
    });
  }

  estadoRecurso(recurso: IRecurso): IEstadoPrestamo {
    return this.prestamoService.estadoRecurso(recurso);
  }

  disponibles(recurso: IRecurso): number {
    return recurso.ejemplares - recurso.ejemplaresComprometidos;
  }

  elegirRecurso(recurso: IRecurso): void {
    if (!this.estadoRecurso(recurso).ok) {
      return;
    }
    this.recursoId = recurso.id;
    this.limpiarAvisos();
  }

  // Los avisos del intento anterior desaparecen al cambiar los datos
  limpiarAvisos(): void {
    this.errores = [];
    this.mensajeExito = '';
  }


  // ------------------------------------------------------------------
  // Paso 3: devolución
  // ------------------------------------------------------------------

  elegirDias(dias: number): void {
    this.fechaDevolucion = this.prestamoService.sumarDias(this.prestamoService.hoy(), dias);
    this.limpiarAvisos();
    this.mesVisible = this.primerDiaDelMes(this.fechaDevolucion);
    this.calendarioAbierto = false;
  }

  // ----- Calendario desplegable -----

  get fechaFormateadaBoton(): string {
    if (!this.fechaDevolucion) return 'Seleccionar fecha';
    const texto = new Intl.DateTimeFormat('es-CL', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    }).format(this.aFecha(this.fechaDevolucion));
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  get tituloMesVisible(): string {
    const texto = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(this.mesVisible);
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  get diasDelCalendario(): DiaCalendario[] {
    const anio = this.mesVisible.getFullYear();
    const mes = this.mesVisible.getMonth();
    const hoy = this.prestamoService.hoy();

    // Semana de lunes a domingo
    const desfase = (new Date(anio, mes, 1).getDay() + 6) % 7;
    const totalDias = new Date(anio, mes + 1, 0).getDate();
    const celdas = Math.ceil((desfase + totalDias) / 7) * 7;

    const dias: DiaCalendario[] = [];

    for (let i = 0; i < celdas; i++) {
      const fecha = new Date(anio, mes, 1 - desfase + i);
      const iso = this.aIso(fecha);

      dias.push({
        numero: fecha.getDate(),
        iso,
        delMes: fecha.getMonth() === mes,
        deshabilitado: iso < this.fechaMinima || iso > this.fechaMaxima,
        esHoy: iso === hoy
      });
    }

    return dias;
  }

  alternarCalendario(event: MouseEvent): void {
    event.stopPropagation();
    this.calendarioAbierto = !this.calendarioAbierto;
  }

  cambiarMes(delta: number, event: MouseEvent): void {
    event.stopPropagation();
    this.mesVisible = new Date(this.mesVisible.getFullYear(), this.mesVisible.getMonth() + delta, 1);
  }

  seleccionarDia(dia: DiaCalendario, event: MouseEvent): void {
    event.stopPropagation();
    if (dia.deshabilitado) return;
    this.fechaDevolucion = dia.iso;
    this.limpiarAvisos();
    this.calendarioAbierto = false;
  }

  private aFecha(iso: string): Date {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d);
  }

  private aIso(fecha: Date): string {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  }

  private primerDiaDelMes(iso: string): Date {
    const f = this.aFecha(iso);
    return new Date(f.getFullYear(), f.getMonth(), 1);
  }

  esDiasElegido(dias: number): boolean {
    return this.fechaDevolucion === this.prestamoService.sumarDias(this.prestamoService.hoy(), dias);
  }

  // Cantidad de días entre hoy y la devolución (para el resumen)
  get diasDePrestamo(): number {
    if (!this.fechaDevolucion) return 0;

    const [a, m, d] = this.fechaDevolucion.split('-').map(Number);
    const [ha, hm, hd] = this.prestamoService.hoy().split('-').map(Number);

    return Math.round((new Date(a, m - 1, d).getTime() - new Date(ha, hm - 1, hd).getTime()) / 86400000);
  }


  // ------------------------------------------------------------------
  // Registrar
  // ------------------------------------------------------------------

  get puedeRegistrar(): boolean {
    return this.usuarioId !== null && this.recursoId !== null && !!this.fechaDevolucion;
  }

  registrar(): void {

    this.errores = [];
    this.mensajeExito = '';

    this.prestamoService.registrarPrestamo({
      usuarioId: this.usuarioId,
      recursoId: this.recursoId,
      fechaDevolucion: this.fechaDevolucion
    }).subscribe({
      next: (resultado) => {

        if (!resultado.ok) {
          this.errores = resultado.errores;
          return;
        }

        const prestamo = resultado.prestamo!;

        // Listo para el siguiente préstamo (la fecha vuelve al plazo habitual)
        this.usuarioId = null;
        this.recursoId = null;
        this.busqueda = '';
        this.elegirDias(DIAS_PRESTAMO_POR_DEFECTO);

        this.mensajeExito =
          'Préstamo registrado: "' + prestamo.recursoTitulo + '" para ' + prestamo.usuarioNombre +
          '. Devolución el ' + prestamo.fechaDevolucion.split('-').reverse().join('/') + '.';

        this.cargar();
      },
      error: (err) => {
        console.error('Error al registrar el préstamo:', err);
        this.errores = ['Ocurrió un error inesperado al registrar el préstamo.'];
      }
    });
  }


  private normalizar(texto: string): string {
    return (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
}
