import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LoginService } from '../../services/login.service';
import { MultasService } from '../../services/multas.service';
import {
  EstadoMultaSancion,
  formatearMonto,
  IFilaMulta,
  IResultadoMulta,
  MONTO_MULTA_MAXIMO,
  MOTIVO_MAXIMO,
  TipoMultaSancion
} from '../../interfaces/imulta-sancion';
import { ISelectorOpcion, SelectorListaComponent } from '../selector-lista/selector-lista.component';

type FiltroEstado = 'todas' | 'pendientes' | 'resueltas';
type AccionMulta = 'pagar' | 'condonar' | 'alternar';

interface IConfirmacion {
  accion: AccionMulta;
  fila: IFilaMulta;
}

// HU-A06: el administrador registra, paga, condona y aplica sanciones
@Component({
  selector: 'app-admin-multas',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectorListaComponent],
  templateUrl: './admin-multas.component.html',
  styleUrl: './admin-multas.component.css'
})
export class AdminMultasComponent implements OnInit {

  // Precondición: sesión administrativa
  esAdmin = false;

  readonly Multa = TipoMultaSancion.Multa;
  readonly Sancion = TipoMultaSancion.Sancion;
  readonly pendiente = EstadoMultaSancion.Pendiente;
  readonly montoMaximo = MONTO_MULTA_MAXIMO;
  readonly motivoMaximo = MOTIVO_MAXIMO;
  readonly formatearMonto = formatearMonto;

  opcionesCiudadano: ISelectorOpcion[] = [];
  filas: IFilaMulta[] = [];

  // Formulario
  usuarioId: number | null = null;
  tipo: TipoMultaSancion = TipoMultaSancion.Multa;
  motivo = '';
  monto: number | null = null;

  // Listado
  filtro: FiltroEstado = 'todas';
  busqueda = '';
  readonly filtros: { valor: FiltroEstado; texto: string }[] = [
    { valor: 'todas', texto: 'Todas' },
    { valor: 'pendientes', texto: 'Pendientes' },
    { valor: 'resueltas', texto: 'Resueltas' }
  ];

  // Mensajes
  errores: string[] = [];
  mensajeExito = '';
  confirmacion: IConfirmacion | null = null;

  constructor(
    private multasService: MultasService,
    private loginService: LoginService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    // sessionStorage solo existe en el navegador (el proyecto usa SSR)
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.esAdmin = this.loginService.isAdmin();
    this.cargar();
  }

  cargar(): void {
    this.filas = this.multasService.todas();

    this.opcionesCiudadano = this.loginService.getCiudadanos().map(c => {
      const pendientes = this.multasService.contarPendientes(c);
      return {
        valor: c.id,
        etiqueta: c.username,
        detalle: pendientes > 0 ? this.multasService.textoPendientes(pendientes) : undefined
      };
    });
  }


  // ------------------------------------------------------------------
  // Registrar
  // ------------------------------------------------------------------

  elegirTipo(tipo: TipoMultaSancion): void {
    this.tipo = tipo;
    this.limpiarAvisos();
  }

  limpiarAvisos(): void {
    this.errores = [];
    this.mensajeExito = '';
  }

  registrar(): void {
    this.limpiarAvisos();
    this.confirmacion = null;

    this.multasService.registrar({
      usuarioId: this.usuarioId,
      tipo: this.tipo,
      motivo: this.motivo,
      monto: this.tipo === TipoMultaSancion.Multa ? this.monto : null
    }).subscribe({
      next: resultado => {
        if (!resultado.ok) {
          this.errores = resultado.errores;
          return;
        }

        const ciudadano = this.nombreDe(this.usuarioId);
        const registro = resultado.multa!;

        this.mensajeExito = registro.tipo === TipoMultaSancion.Multa
          ? 'Multa de ' + formatearMonto(registro.monto!) + ' registrada para ' + ciudadano + '.'
          : 'Sanción registrada para ' + ciudadano + '.';

        // Listo para el siguiente registro
        this.motivo = '';
        this.monto = null;
        this.cargar();
      },
      error: err => {
        console.error('Error al registrar la multa:', err);
        this.errores = ['Ocurrió un error inesperado al registrar.'];
      }
    });
  }


  // ------------------------------------------------------------------
  // Listado
  // ------------------------------------------------------------------

  get filasFiltradas(): IFilaMulta[] {
    const palabras = this.normalizar(this.busqueda).split(/\s+/).filter(Boolean);

    return this.filas.filter(f => {
      const estado = f.multa.estado === EstadoMultaSancion.Pendiente ? 'pendientes' : 'resueltas';
      if (this.filtro !== 'todas' && this.filtro !== estado) return false;

      const texto = this.normalizar(`${f.ciudadano} ${f.multa.motivo} ${f.multa.tipo}`);
      return palabras.every(p => texto.includes(p));
    });
  }

  contar(filtro: FiltroEstado): number {
    if (filtro === 'todas') return this.filas.length;
    return this.filas.filter(f =>
      (f.multa.estado === EstadoMultaSancion.Pendiente) === (filtro === 'pendientes')
    ).length;
  }

  etiquetaEstado(fila: IFilaMulta): string {
    return this.multasService.etiquetaEstado(fila.multa);
  }

  // Clase de color del estado
  claseEstado(fila: IFilaMulta): string {
    const m = fila.multa;
    if (m.tipo === TipoMultaSancion.Sancion) {
      return m.estado === EstadoMultaSancion.Pendiente ? 'pill--activa' : 'pill--levantada';
    }
    if (m.estado === EstadoMultaSancion.Pendiente) return 'pill--pendiente';
    return m.resolucion === 'Condonada' ? 'pill--condonada' : 'pill--pagada';
  }


  // ------------------------------------------------------------------
  // Pagar, condonar y alternar sanción (con confirmación en línea)
  // ------------------------------------------------------------------

  solicitar(accion: AccionMulta, fila: IFilaMulta): void {
    this.limpiarAvisos();
    this.confirmacion = { accion, fila };
  }

  cancelar(): void {
    this.confirmacion = null;
  }

  get textoConfirmacion(): string {
    if (!this.confirmacion) return '';

    const { accion, fila } = this.confirmacion;
    const que = this.multasService.descripcion(fila.multa);

    switch (accion) {
      case 'pagar':
        return '¿Marcar como pagada la ' + que + ' de ' + fila.ciudadano + '?';
      case 'condonar':
        return '¿Condonar la ' + que + ' de ' + fila.ciudadano + '? Quedará sin cobro.';
      default:
        return fila.multa.estado === EstadoMultaSancion.Pendiente
          ? '¿Levantar la ' + que + ' de ' + fila.ciudadano + '?'
          : '¿Reactivar la ' + que + ' de ' + fila.ciudadano + '?';
    }
  }

  get textoBotonConfirmar(): string {
    if (!this.confirmacion) return '';

    switch (this.confirmacion.accion) {
      case 'pagar': return 'Confirmar pago';
      case 'condonar': return 'Confirmar condonación';
      default:
        return this.confirmacion.fila.multa.estado === EstadoMultaSancion.Pendiente
          ? 'Levantar sanción'
          : 'Reactivar sanción';
    }
  }

  confirmar(): void {
    if (!this.confirmacion) return;

    const { accion, fila } = this.confirmacion;
    const que = this.multasService.descripcion(fila.multa);
    const estabaPendiente = fila.multa.estado === EstadoMultaSancion.Pendiente;

    const operacion = accion === 'pagar'
      ? this.multasService.pagar(fila.usuarioId, fila.multa.id)
      : accion === 'condonar'
        ? this.multasService.condonar(fila.usuarioId, fila.multa.id)
        : this.multasService.alternarSancion(fila.usuarioId, fila.multa.id);

    operacion.subscribe({
      next: (resultado: IResultadoMulta) => {
        this.confirmacion = null;

        if (!resultado.ok) {
          this.errores = resultado.errores;
        } else {
          const hecho = accion === 'pagar'
            ? 'marcada como pagada'
            : accion === 'condonar'
              ? 'condonada'
              : estabaPendiente ? 'levantada' : 'reactivada';

          this.mensajeExito = 'La ' + que + ' de ' + fila.ciudadano + ' quedó ' + hecho + '.';
        }

        this.cargar();
      },
      error: err => {
        console.error('Error al actualizar la multa:', err);
        this.confirmacion = null;
        this.errores = ['Ocurrió un error inesperado.'];
      }
    });
  }


  private nombreDe(usuarioId: number | null): string {
    return this.opcionesCiudadano.find(o => o.valor === usuarioId)?.etiqueta ?? 'el ciudadano';
  }

  private normalizar(texto: string): string {
    return (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
}
