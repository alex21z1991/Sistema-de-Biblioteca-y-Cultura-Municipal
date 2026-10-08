import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogoService } from '../../services/catalogo.service';
import { IRecurso, IRecursoForm } from '../../interfaces/irecurso';

@Component({
  selector: 'app-admin-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-catalogo.component.html',
  styleUrl: './admin-catalogo.component.css'
})
export class AdminCatalogoComponent implements OnInit {
  recursos: IRecurso[] = [];
  formulario: IRecursoForm = this.formularioVacio();
  idEnEdicion: number | null = null;
  busqueda = '';
  errores: string[] = [];
  mensaje = '';

  constructor(private catalogoService: CatalogoService) {}

  ngOnInit(): void { this.cargarRecursos(); }

  cargarRecursos(): void {
    this.catalogoService.getRecursos().subscribe(lista => this.recursos = lista);
  }

  get recursosFiltrados(): IRecurso[] {
    const texto = this.busqueda.trim().toLowerCase();
    if (!texto) return this.recursos;
    return this.recursos.filter(r => r.titulo.toLowerCase().includes(texto) || r.autor.toLowerCase().includes(texto) || r.categoria.toLowerCase().includes(texto) || r.tipo.toLowerCase().includes(texto));
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
