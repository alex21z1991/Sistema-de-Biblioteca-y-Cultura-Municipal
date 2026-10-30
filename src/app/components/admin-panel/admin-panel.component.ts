import { Component, OnInit, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ActividadService } from '../../services/actividad.service';
import { LoginService } from '../../services/login.service';
import { IActividad, IActividadForm, TipoActividad } from '../../interfaces/iactividad';
import {
  LUGARES_ACTIVIDAD,
  aforoDeLugar,
  DURACIONES_RAPIDAS,
  DURACION_MINIMA,
  DURACION_MAXIMA,
  DURACION_POR_DEFECTO,
  HORAS_INICIO,
  formatearDuracion,
  horaFin
} from '../../data/listas';
import { IUser } from '../../interfaces/iuser';

interface DiaCalendario {
  numero: number;
  iso: string;
  delMes: boolean;
  deshabilitado: boolean;
  esHoy: boolean;
}

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

  pestanaActiva: 'formulario' | 'cartelera' = 'formulario';

  readonly lugares = LUGARES_ACTIVIDAD;

  readonly duracionesRapidas = DURACIONES_RAPIDAS;
  readonly duracionMin = DURACION_MINIMA;
  readonly duracionMax = DURACION_MAXIMA;
  readonly duracionTexto = formatearDuracion;

  actividades: IActividad[] = [];

  formulario: IActividadForm = this.formularioVacio();

  fechaDia: string = '';
  horaInicio: string = '';
  otraDuracion: boolean = false;

  // Estado del calendario institucional
  calendarioAbierto: boolean = false;
  mesVisible: Date = new Date();
  readonly diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  // Estado del selector buscable de lugares
  buscadorLugarAbierto: boolean = false;
  filtroTextoLugar: string = '';
  filtroAforoLugar: 'todos' | 'chico' | 'medio' | 'grande' = 'todos';

  idEnEdicion: number | null = null;
  idPorCancelar: number | null = null;

  errores: string[] = [];
  mensajeExito: string = '';

  fechaMinima: string = '';
  capacidadMinima: number = 1;

  esAdmin: boolean = false;

  // Ventana de inscripciones
  windowOpen: boolean = false;
  windowMode: 'agregar' | 'quitar' = 'agregar';
  selectedActivity: IActividad | null = null;
  usersWindow: IUser[] = [];

  constructor(
    private actividadService: ActividadService,
    private loginService: LoginService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.esAdmin = this.loginService.isAdmin();
    this.fechaMinima = this.ahoraEnTexto();
    this.mesVisible = new Date();

    this.fijarDia(0);
    this.cargarActividades();
  }

  @HostListener('document:click', ['$event'])
  alClickDocumento(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.selector-fecha-wrapper')) {
      this.calendarioAbierto = false;
    }
    if (!target.closest('.selector-lugar-wrapper')) {
      this.buscadorLugarAbierto = false;
    }
  }

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
  // Ventana de inscripciones
  // ------------------------------------------------------------------

  cargarUsuarios(mode: 'agregar' | 'quitar'): void {
    this.usersWindow = [];
    if (mode === 'agregar') {
      this.loginService.getUsers().forEach(user => {
        if (user.role === 'usuario' && !this.selectedActivity?.inscritos.includes(user.id)) {
          this.usersWindow.push(user);
        }
      })
    } else if (mode === 'quitar') {
      for (const userId of this.selectedActivity?.inscritos || []) {
        const user = this.loginService.getUsers().find(u => u.id === userId);
        if (user) {
          this.usersWindow.push(user);
        }
      }
    }
  }

  openWindow(actividad: IActividad, mode: 'agregar' | 'quitar'): void {
    this.selectedActivity = actividad;
    this.windowMode = mode;
    this.cargarUsuarios(mode);
    this.windowOpen = true;
  }

  closeWindow(): void {
    this.windowOpen = false;
    this.selectedActivity = null;
    this.usersWindow = [];
  }

  addUser(actividad: IActividad, usuario: IUser): void {
    this.actividadService.inscribirUsuario(actividad.id, usuario.id).subscribe({
      next: (resultado) => {
        if (resultado.ok) {
          this.closeWindow();
          this.cargarActividades();
        } else {
          this.errores = resultado.errores;
        }
      }
    });
  }

  removeUser(actividad: IActividad, usuario: IUser): void {
    this.actividadService.quitarInscripcion(actividad.id, usuario.id).subscribe({
      next: (resultado) => {
        if (resultado.ok) {
          this.closeWindow();
          this.cargarActividades();
        } else {
          this.errores = resultado.errores;
        }
      }
    });
  }


  // ------------------------------------------------------------------
  // Guardar (crea o edita según el modo)
  // ------------------------------------------------------------------

  guardar(): void {
    this.errores = [];
    this.mensajeExito = '';

    if (this.idEnEdicion !== null) {
      this.actividadService
        .actualizarActividad(this.idEnEdicion, this.formulario)
        .subscribe({
          next: (resultado) => {
            if (resultado.ok) {
              this.mensajeExito = 'Actividad actualizada en la cartelera.';
              this.cancelarEdicion();
              this.cargarActividades();
              this.pestanaActiva = 'cartelera';
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

    this.actividadService
      .crearActividad(this.formulario)
      .subscribe({
        next: (resultado) => {
          if (resultado.ok) {
            this.mensajeExito = 'Actividad publicada correctamente en la cartelera.';
            this.formulario = this.formularioVacio();
            this.reiniciarHorario();
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

  editar(actividad: IActividad): void {
    this.idEnEdicion = actividad.id;
    this.errores = [];
    this.mensajeExito = '';
    this.pestanaActiva = 'formulario';

    this.formulario = {
      titulo: actividad.titulo,
      tipo: actividad.tipo,
      lugar: actividad.lugar,
      descripcion: actividad.descripcion,
      fecha: actividad.fecha,
      duracion: actividad.duracion,
      capacidad: actividad.capacidad
    };

    this.fechaDia = actividad.fecha.slice(0, 10);
    this.horaInicio = actividad.fecha.slice(11, 16);
    this.otraDuracion = false;

    if (this.fechaDia) {
      this.mesVisible = new Date(this.fechaDia + 'T12:00:00');
    }

    this.capacidadMinima = actividad.inscritos.length > 0 ? actividad.inscritos.length : 1;
  }

  cancelarEdicion(): void {
    this.idEnEdicion = null;
    this.formulario = this.formularioVacio();
    this.reiniciarHorario();
    this.capacidadMinima = 1;
    this.errores = [];
  }

  solicitarCancelacion(actividad: IActividad): void {
    this.errores = [];
    this.mensajeExito = '';
    this.idPorCancelar = actividad.id;
  }

  descartarCancelacion(): void {
    this.idPorCancelar = null;
  }

  confirmarCancelacion(actividad: IActividad): void {
    this.idPorCancelar = null;
    this.alternarEstado(actividad);
  }

  alternarEstado(actividad: IActividad): void {
    this.errores = [];
    this.mensajeExito = '';

    this.actividadService.alternarEstado(actividad.id).subscribe({
      next: (resultado) => {
        if (resultado.ok) {
          this.mensajeExito =
            `Actividad "${actividad.titulo}" ${resultado.actividad?.estado === 'Cancelada'
              ? 'cancelada'
              : 'reactivada'}.`;
          this.cargarActividades();
        } else {
          this.errores = resultado.errores;
        }
      }
    });
  }

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

  quitarInscripcion(actividad: IActividad): void {
    this.errores = [];
    this.mensajeExito = '';

    this.actividadService.quitarInscripcion(actividad.id, 1).subscribe({
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
  // Selector Buscable de Lugares
  // ------------------------------------------------------------------

  get lugaresFiltrados() {
    const texto = this.filtroTextoLugar.trim().toLowerCase();

    return this.lugares.filter((l) => {
      const coincideTexto = !texto || l.nombre.toLowerCase().includes(texto);

      let coincideAforo = true;
      if (this.filtroAforoLugar === 'chico') coincideAforo = l.aforo <= 30;
      else if (this.filtroAforoLugar === 'medio') coincideAforo = l.aforo > 30 && l.aforo <= 80;
      else if (this.filtroAforoLugar === 'grande') coincideAforo = l.aforo > 80;

      return coincideTexto && coincideAforo;
    });
  }

  abrirBuscadorLugar(event: MouseEvent): void {
    event.stopPropagation();
    this.buscadorLugarAbierto = !this.buscadorLugarAbierto;
    this.calendarioAbierto = false;
    if (this.buscadorLugarAbierto) {
      this.filtroTextoLugar = '';
    }
  }

  seleccionarLugar(nombreLugar: string, event: MouseEvent): void {
    event.stopPropagation();
    this.formulario.lugar = nombreLugar;
    this.buscadorLugarAbierto = false;
    this.alElegirLugar();
  }

  cambiarFiltroAforo(rango: 'todos' | 'chico' | 'medio' | 'grande', event: MouseEvent): void {
    event.stopPropagation();
    this.filtroAforoLugar = rango;
  }

  // ------------------------------------------------------------------
  // Calendario Institucional y Horario
  // ------------------------------------------------------------------

  get hoy(): string {
    return this.fechaMinima.slice(0, 10);
  }

  get fechaFormateadaBoton(): string {
    if (!this.fechaDia) return 'Seleccionar fecha';
    const [y, m, d] = this.fechaDia.split('-');
    const fecha = new Date(Number(y), Number(m) - 1, Number(d));
    const texto = new Intl.DateTimeFormat('es-CL', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(fecha);
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  get tituloMesVisible(): string {
    const texto = new Intl.DateTimeFormat('es-CL', {
      month: 'long',
      year: 'numeric'
    }).format(this.mesVisible);
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  get diasDelCalendario(): DiaCalendario[] {
    const year = this.mesVisible.getFullYear();
    const month = this.mesVisible.getMonth();

    const primerDiaMes = new Date(year, month, 1);
    const ultimoDiaMes = new Date(year, month + 1, 0);

    const offsetInicio = (primerDiaMes.getDay() + 6) % 7;
    const totalDias = ultimoDiaMes.getDate();

    const dias: DiaCalendario[] = [];
    const hoyIso = this.hoy;

    const ultimoDiaMesPrevio = new Date(year, month, 0).getDate();
    for (let i = offsetInicio - 1; i >= 0; i--) {
      const num = ultimoDiaMesPrevio - i;
      const fecha = new Date(year, month - 1, num);
      const iso = this.aTexto(fecha).slice(0, 10);
      dias.push({
        numero: num,
        iso,
        delMes: false,
        deshabilitado: iso < hoyIso,
        esHoy: iso === hoyIso
      });
    }

    for (let num = 1; num <= totalDias; num++) {
      const fecha = new Date(year, month, num);
      const iso = this.aTexto(fecha).slice(0, 10);
      dias.push({
        numero: num,
        iso,
        delMes: true,
        deshabilitado: iso < hoyIso,
        esHoy: iso === hoyIso
      });
    }

    const restantes = (7 - (dias.length % 7)) % 7;
    for (let num = 1; num <= restantes; num++) {
      const fecha = new Date(year, month + 1, num);
      const iso = this.aTexto(fecha).slice(0, 10);
      dias.push({
        numero: num,
        iso,
        delMes: false,
        deshabilitado: iso < hoyIso,
        esHoy: iso === hoyIso
      });
    }

    return dias;
  }

  alternarCalendario(event: MouseEvent): void {
    event.stopPropagation();
    this.calendarioAbierto = !this.calendarioAbierto;
    this.buscadorLugarAbierto = false;
  }

  cambiarMes(delta: number, event: MouseEvent): void {
    event.stopPropagation();
    this.mesVisible = new Date(
      this.mesVisible.getFullYear(),
      this.mesVisible.getMonth() + delta,
      1
    );
  }

  seleccionarDiaCalendario(dia: DiaCalendario, event: MouseEvent): void {
    event.stopPropagation();
    if (dia.deshabilitado) return;
    this.fechaDia = dia.iso;
    this.calendarioAbierto = false;
    this.actualizarFecha();
  }

  esAtajoActivo(diasDesdeHoy: number): boolean {
    const objetivo = new Date();
    objetivo.setDate(objetivo.getDate() + diasDesdeHoy);
    return this.fechaDia === this.aTexto(objetivo).slice(0, 10);
  }

  get horasOpciones(): string[] {
    if (this.horaInicio && !HORAS_INICIO.includes(this.horaInicio)) {
      return [...HORAS_INICIO, this.horaInicio].sort();
    }
    return HORAS_INICIO;
  }

  get esDuracionRapida(): boolean {
    return DURACIONES_RAPIDAS.includes(Number(this.formulario.duracion));
  }

  get mostrarOtra(): boolean {
    return this.otraDuracion || !this.esDuracionRapida;
  }

  actualizarFecha(): void {
    this.formulario.fecha = this.fechaDia && this.horaInicio
      ? this.fechaDia + 'T' + this.horaInicio
      : '';
  }

  fijarDia(diasDesdeHoy: number): void {
    const dia = new Date();
    dia.setDate(dia.getDate() + diasDesdeHoy);
    this.fechaDia = this.aTexto(dia).slice(0, 10);
    this.mesVisible = new Date(dia.getFullYear(), dia.getMonth(), 1);
    this.calendarioAbierto = false;
    this.actualizarFecha();
  }

  elegirDuracion(minutos: number): void {
    this.formulario.duracion = minutos;
    this.otraDuracion = false;
  }

  activarOtra(): void {
    this.otraDuracion = true;
  }

  get resumenHorario(): string {
    if (!this.formulario.fecha) return '';

    const inicio = new Date(this.formulario.fecha);
    if (isNaN(inicio.getTime())) return '';

    const diaTexto = new Intl.DateTimeFormat('es-CL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(inicio);

    const dia = diaTexto.charAt(0).toUpperCase() + diaTexto.slice(1);

    const duracion = Number(this.formulario.duracion);
    if (!duracion || duracion < 1) return dia + ' · a las ' + this.horaInicio;

    return dia + ' · de ' + this.horaInicio + ' a ' +
      horaFin(this.formulario.fecha, duracion) + ' (' + formatearDuracion(duracion) + ')';
  }

  finDe(actividad: IActividad): string {
    return horaFin(actividad.fecha, actividad.duracion);
  }

  get aforoLugar(): number | null {
    return aforoDeLugar(this.formulario.lugar) ?? null;
  }

  alElegirLugar(): void {
    const aforo = this.aforoLugar;
    if (aforo === null) return;

    if (this.idEnEdicion === null) {
      this.formulario.capacidad = aforo;
    } else if (this.formulario.capacidad > aforo) {
      this.formulario.capacidad = aforo;
    }
  }

  yaPaso(actividad: IActividad): boolean {
    return new Date(actividad.fecha).getTime() <= new Date().getTime();
  }

  cuposDisponibles(actividad: IActividad): number {
    return actividad.capacidad - actividad.inscritos.length;
  }

  private formularioVacio(): IActividadForm {
    return {
      titulo: '',
      tipo: TipoActividad.Taller,
      lugar: '',
      descripcion: '',
      fecha: '',
      duracion: DURACION_POR_DEFECTO,
      capacidad: 1
    };
  }

  private reiniciarHorario(): void {
    this.fijarDia(0);
    this.horaInicio = '';
    this.otraDuracion = false;
  }

  private ahoraEnTexto(): string {
    return this.aTexto(new Date());
  }

  private aTexto(fecha: Date): string {
    const copia = new Date(fecha.getTime());
    copia.setSeconds(0, 0);
    const desfase = copia.getTimezoneOffset() * 60000;
    return new Date(copia.getTime() - desfase)
      .toISOString()
      .slice(0, 16);
  }
}
