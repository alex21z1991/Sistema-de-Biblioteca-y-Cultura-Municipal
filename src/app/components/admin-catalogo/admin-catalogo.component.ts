import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogoService } from '../../services/catalogo.service';
import { IRecurso, IRecursoForm } from '../../interfaces/irecurso';
import { GRUPOS_CATEGORIAS, TIPOS_RECURSO } from '../../data/listas';
import { ISelectorOpcion, SelectorListaComponent } from '../selector-lista/selector-lista.component';

type FiltroEstado = 'todos' | 'activos' | 'baja';
type CampoOrden = 'titulo' | 'autor' | 'categoria' | 'disponibles';

@Component({
  selector: 'app-admin-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectorListaComponent],
  templateUrl: './admin-catalogo.component.html',
  styleUrl: './admin-catalogo.component.css'
})
export class AdminCatalogoComponent implements OnInit {
  readonly gruposCategorias = GRUPOS_CATEGORIAS;
  readonly tiposRecurso = TIPOS_RECURSO;

  // Opciones de las listas desplegables
  readonly opcionesCategoria: ISelectorOpcion[] = GRUPOS_CATEGORIAS.flatMap(g =>
    g.categorias.map(c => ({ valor: c, etiqueta: c, grupo: g.grupo }))
  );
  readonly opcionesTipo: ISelectorOpcion[] = TIPOS_RECURSO.map(t => ({ valor: t, etiqueta: t }));
  opcionesFiltroTipo: ISelectorOpcion[] = [{ valor: '', etiqueta: 'Todos los tipos' }];
  opcionesFiltroCategoria: ISelectorOpcion[] = [{ valor: '', etiqueta: 'Todas las categorías' }];

  recursos: IRecurso[] = [];
  formulario: IRecursoForm = this.formularioVacio();
  idEnEdicion: number | null = null;
  idPorDarDeBaja: number | null = null;  // confirmación en línea

  // Búsqueda, filtros y orden del listado
  busqueda = '';
  filtroTipo = '';
  filtroCategoria = '';
  filtroEstado: FiltroEstado = 'todos';
  orden: { campo: CampoOrden; asc: boolean } = { campo: 'titulo', asc: true };

  errores: string[] = [];
  mensaje = '';

  constructor(private catalogoService: CatalogoService) {}

  ngOnInit(): void { this.cargarRecursos(); }

  cargarRecursos(): void {
    this.catalogoService.getRecursos().subscribe(lista => {
      this.recursos = lista;

      // Los filtros solo ofrecen lo que existe en el catálogo
      this.opcionesFiltroTipo = [
        { valor: '', etiqueta: 'Todos los tipos' },
        ...this.tiposEnUso.map(t => ({ valor: t, etiqueta: t }))
      ];
      this.opcionesFiltroCategoria = [
        { valor: '', etiqueta: 'Todas las categorías' },
        ...this.categoriasEnUso.map(c => ({ valor: c, etiqueta: c }))
      ];
    });
  }

  // ------------------------------------------------------------------
  // Búsqueda y filtros (sin distinguir mayúsculas ni tildes)
  // ------------------------------------------------------------------

  private normalizar(texto: string): string {
    return (texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  get recursosFiltrados(): IRecurso[] {
    // Cada palabra escrita debe aparecer en título, autor, categoría o tipo
    const palabras = this.normalizar(this.busqueda).split(/\s+/).filter(Boolean);

    const lista = this.recursos.filter(r => {
      if (this.filtroTipo && r.tipo !== this.filtroTipo) return false;
      if (this.filtroCategoria && r.categoria !== this.filtroCategoria) return false;
      if (this.filtroEstado === 'activos' && !r.activo) return false;
      if (this.filtroEstado === 'baja' && r.activo) return false;

      const texto = this.normalizar(`${r.titulo} ${r.autor} ${r.categoria} ${r.tipo}`);
      return palabras.every(p => texto.includes(p));
    });

    const { campo, asc } = this.orden;
    const dir = asc ? 1 : -1;

    return lista.sort((a, b) => {
      if (campo === 'disponibles') {
        return (this.disponibles(a) - this.disponibles(b)) * dir;
      }
      return a[campo].localeCompare(b[campo], 'es', { sensitivity: 'base' }) * dir;
    });
  }

  // Opciones de los filtros: solo lo que existe en el catálogo
  get tiposEnUso(): string[] {
    return [...new Set(this.recursos.map(r => r.tipo))].sort((a, b) => a.localeCompare(b, 'es'));
  }

  get categoriasEnUso(): string[] {
    return [...new Set(this.recursos.map(r => r.categoria))].sort((a, b) => a.localeCompare(b, 'es'));
  }

  get totalActivos(): number {
    return this.recursos.filter(r => r.activo).length;
  }

  get totalBaja(): number {
    return this.recursos.length - this.totalActivos;
  }

  get hayFiltros(): boolean {
    return !!(this.busqueda.trim() || this.filtroTipo || this.filtroCategoria || this.filtroEstado !== 'todos');
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroTipo = '';
    this.filtroCategoria = '';
    this.filtroEstado = 'todos';
  }

  ordenarPor(campo: CampoOrden): void {
    this.orden = this.orden.campo === campo
      ? { campo, asc: !this.orden.asc }
      : { campo, asc: true };
  }

  ariaOrden(campo: CampoOrden): 'ascending' | 'descending' | 'none' {
    if (this.orden.campo !== campo) return 'none';
    return this.orden.asc ? 'ascending' : 'descending';
  }

  guardar(): void {
    this.limpiarMensajes();
    const operacion = this.idEnEdicion === null ? this.catalogoService.crearRecurso(this.formulario) : this.catalogoService.actualizarRecurso(this.idEnEdicion, this.formulario);
    operacion.subscribe(resultado => {
      if (!resultado.ok) { this.errores = resultado.errores; return; }
      this.mensaje = this.idEnEdicion === null ? 'Recurso creado correctamente.' : 'Recurso actualizado correctamente.';
      this.cancelarEdicion(false);
      this.cargarRecursos();
    });
  }

  editar(recurso: IRecurso): void {
    this.limpiarMensajes(); this.idEnEdicion = recurso.id;
    this.formulario = { 
    titulo: recurso.titulo, 
    autor: recurso.autor, 
    categoria: recurso.categoria, 
    tipo: recurso.tipo, 
    ejemplares: recurso.ejemplares 
  };
  }

  cancelarEdicion(limpiarMensaje = true): void {
    this.idEnEdicion = null; this.formulario = this.formularioVacio(); this.errores = [];
    if (limpiarMensaje) this.mensaje = '';
  }

  solicitarBaja(recurso: IRecurso): void {
    this.limpiarMensajes();
    this.idPorDarDeBaja = recurso.id;
  }

  cancelarBaja(): void {
    this.idPorDarDeBaja = null;
  }

  confirmarBaja(recurso: IRecurso): void {
    this.idPorDarDeBaja = null;
    this.darDeBaja(recurso);
  }

  darDeBaja(recurso: IRecurso): void {
    this.limpiarMensajes();
    this.catalogoService.darDeBaja(recurso.id).subscribe(resultado => {
      if (!resultado.ok) { this.errores = resultado.errores; return; }
      this.mensaje = 'Recurso dado de baja correctamente.'; this.cargarRecursos();
    });
  }

  reactivar(recurso: IRecurso): void {
    this.limpiarMensajes();
    this.catalogoService.reactivar(recurso.id).subscribe(resultado => {
      if (!resultado.ok) { this.errores = resultado.errores; return; }
      this.mensaje = 'Recurso reactivado correctamente.'; this.cargarRecursos();
    });
  }

  disponibles(recurso: IRecurso): number { return recurso.ejemplares - recurso.ejemplaresComprometidos; }
  private limpiarMensajes(): void { this.errores = []; this.mensaje = ''; }
  private formularioVacio(): IRecursoForm { return { titulo: '', autor: '', categoria: '', tipo: 'Libro', ejemplares: 1 }; }
}
