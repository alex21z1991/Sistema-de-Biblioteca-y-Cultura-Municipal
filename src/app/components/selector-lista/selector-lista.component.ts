import {
  ChangeDetectorRef, Component, ElementRef, EventEmitter, forwardRef,
  HostListener, Input, OnChanges, Output, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type ValorSelector = string | number | null;

export interface ISelectorOpcion {
  valor: ValorSelector;
  etiqueta: string;
  grupo?: string;          // las opciones consecutivas con el mismo grupo se agrupan
  detalle?: string;        // texto secundario a la derecha (ej. un motivo)
  deshabilitada?: boolean;
}

// Fila ya preparada para mostrar: encabezado de grupo u opción
interface FilaSelector {
  grupo?: string;
  opcion?: ISelectorOpcion;
  indice?: number;         // posición entre las opciones visibles
}

// Lista desplegable con el diseño del portal (reemplaza al <select> nativo).
// Funciona con ngModel: <app-selector-lista [(ngModel)]="x" [opciones]="..." required>
@Component({
  selector: 'app-selector-lista',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './selector-lista.component.html',
  styleUrl: './selector-lista.component.css',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SelectorListaComponent),
    multi: true
  }]
})
export class SelectorListaComponent implements ControlValueAccessor, OnChanges {

  @Input() opciones: ISelectorOpcion[] = [];
  @Input() placeholder = 'Selecciona una opción';
  @Input() inputId = '';
  @Input() ariaLabel = '';
  @Input() buscable = false;              // muestra un buscador dentro de la lista
  @Input() textoBuscar = 'Buscar…';
  @Output() cambio = new EventEmitter<ValorSelector>();

  @ViewChild('buscador') buscador?: ElementRef<HTMLInputElement>;
  @ViewChild('panel') panel?: ElementRef<HTMLElement>;

  valor: ValorSelector = null;
  abierto = false;
  arriba = false;                         // abrir hacia arriba si no hay espacio abajo
  deshabilitado = false;
  consulta = '';
  filas: FilaSelector[] = [];
  activo = -1;                            // índice de la opción resaltada con el teclado

  private visibles: ISelectorOpcion[] = [];
  private alCambiar: (v: ValorSelector) => void = () => {};
  private alTocar: () => void = () => {};

  constructor(private host: ElementRef<HTMLElement>, private cd: ChangeDetectorRef) {}

  ngOnChanges(): void {
    this.reconstruir();
  }

  // ----- ControlValueAccessor -----

  writeValue(valor: ValorSelector): void {
    this.valor = valor ?? null;
    this.cd.markForCheck();
  }

  registerOnChange(fn: (v: ValorSelector) => void): void { this.alCambiar = fn; }
  registerOnTouched(fn: () => void): void { this.alTocar = fn; }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado = deshabilitado;
    this.cd.markForCheck();
  }

  // ----- Estado -----

  get seleccion(): ISelectorOpcion | undefined {
    return this.opciones.find(o => o.valor === this.valor);
  }

  esSeleccionada(opcion: ISelectorOpcion): boolean {
    return opcion.valor === this.valor;
  }

  // Cierra al hacer clic fuera (mousedown: otros popups detienen el evento click)
  @HostListener('document:mousedown', ['$event'])
  alPresionarDocumento(evento: MouseEvent): void {
    if (this.abierto && !this.host.nativeElement.contains(evento.target as Node)) {
      this.cerrar(false);
    }
  }

  // ----- Abrir y cerrar -----

  alternar(): void {
    if (this.deshabilitado) return;
    this.abierto ? this.cerrar(true) : this.abrir();
  }

  private abrir(): void {
    this.consulta = '';
    this.reconstruir();
    this.abierto = true;

    // Resalta la opción elegida (o la primera disponible)
    const elegida = this.visibles.findIndex(o => o.valor === this.valor && !o.deshabilitada);
    this.activo = elegida >= 0 ? elegida : this.siguiente(-1, 1);

    // Después de pintar: enfoca, decide hacia dónde abrir y muestra la opción activa
    setTimeout(() => {
      const caja = this.panel?.nativeElement;
      if (caja) {
        const rect = caja.getBoundingClientRect();
        const espacioArriba = this.host.nativeElement.getBoundingClientRect().top;
        this.arriba = rect.bottom > window.innerHeight && espacioArriba > rect.height;
        this.cd.markForCheck();
      }
      (this.buscable ? this.buscador?.nativeElement : this.panel?.nativeElement)?.focus({ preventScroll: true });
      this.mostrarActivo();
    });
  }

  private cerrar(devolverFoco: boolean): void {
    this.abierto = false;
    this.arriba = false;
    this.alTocar();
    if (devolverFoco) {
      (this.host.nativeElement.querySelector('.selector__boton') as HTMLElement | null)?.focus();
    }
  }

  elegir(opcion: ISelectorOpcion): void {
    if (opcion.deshabilitada) return;
    this.valor = opcion.valor;
    this.alCambiar(opcion.valor);
    this.cambio.emit(opcion.valor);
    this.cerrar(true);
  }

  // ----- Buscador -----

  alEscribir(texto: string): void {
    this.consulta = texto;
    this.reconstruir();
    this.activo = this.siguiente(-1, 1);
    this.mostrarActivo();
  }

  // ----- Teclado -----

  alPresionarTecla(evento: KeyboardEvent): void {
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        this.mover(1);
        break;
      case 'ArrowUp':
        evento.preventDefault();
        this.mover(-1);
        break;
      case 'Home':
        if (!this.buscable) { evento.preventDefault(); this.activo = this.siguiente(-1, 1); this.mostrarActivo(); }
        break;
      case 'End':
        if (!this.buscable) { evento.preventDefault(); this.activo = this.siguiente(this.visibles.length, -1); this.mostrarActivo(); }
        break;
      case 'Enter':
        evento.preventDefault();      // no enviar el formulario
        if (this.activo >= 0) this.elegir(this.visibles[this.activo]);
        break;
      case 'Escape':
        evento.preventDefault();
        evento.stopPropagation();
        this.cerrar(true);
        break;
      case 'Tab':
        this.cerrar(false);
        break;
    }
  }

  alPresionarBoton(evento: KeyboardEvent): void {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      if (!this.abierto) this.abrir();
    }
  }

  private mover(paso: 1 | -1): void {
    const siguiente = this.siguiente(this.activo, paso);
    if (siguiente >= 0) {
      this.activo = siguiente;
      this.mostrarActivo();
    }
  }

  // Siguiente opción habilitada a partir de una posición (-1 si no hay)
  private siguiente(desde: number, paso: 1 | -1): number {
    for (let i = desde + paso; i >= 0 && i < this.visibles.length; i += paso) {
      if (!this.visibles[i].deshabilitada) return i;
    }
    return desde >= 0 && desde < this.visibles.length ? desde : -1;
  }

  private mostrarActivo(): void {
    setTimeout(() => {
      this.panel?.nativeElement
        .querySelector('.selector__opcion--activa')
        ?.scrollIntoView({ block: 'nearest' });
    });
  }

  // ----- Filas visibles (filtradas por el buscador y con encabezados de grupo) -----

  private reconstruir(): void {
    const palabras = this.normalizar(this.consulta).split(/\s+/).filter(Boolean);

    this.visibles = this.opciones.filter(o => {
      const texto = this.normalizar(`${o.etiqueta} ${o.grupo ?? ''}`);
      return palabras.every(p => texto.includes(p));
    });

    this.filas = [];
    let grupoActual: string | undefined;

    this.visibles.forEach((opcion, indice) => {
      if (opcion.grupo && opcion.grupo !== grupoActual) {
        this.filas.push({ grupo: opcion.grupo });
      }
      grupoActual = opcion.grupo;
      this.filas.push({ opcion, indice });
    });
  }

  private normalizar(texto: string): string {
    return (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
}
