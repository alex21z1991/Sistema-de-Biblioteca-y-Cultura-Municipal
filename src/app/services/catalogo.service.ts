import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { IRecurso, IRecursoForm, IResultadoRecurso } from '../interfaces/irecurso';
import { LoginService } from './login.service';

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private recursos: IRecurso[] = [
    { id: 1, titulo: 'Cien años de soledad', autor: 'Gabriel García Márquez', categoria: 'Literatura', tipo: 'Libro', ejemplares: 5, ejemplaresComprometidos: 2, activo: true },
    { id: 2, titulo: 'Libro1', autor: 'Autor1', categoria: 'Historia', tipo: 'Libro', ejemplares: 3, ejemplaresComprometidos: 0, activo: true },
    { id: 3, titulo: 'Libro2', autor: 'Autor2', categoria: 'Ciencia', tipo: 'Revista', ejemplares: 2, ejemplaresComprometidos: 0, activo: false },
    // Datos de prueba para la HU-C05 (confirmar reservas)
    { id: 4, titulo: 'Subterra', autor: 'Baldomero Lillo', categoria: 'Cuentos y relatos', tipo: 'Libro', ejemplares: 4, ejemplaresComprometidos: 1, activo: true },
    { id: 5, titulo: 'Historia de Arica', autor: 'Autor3', categoria: 'Historia', tipo: 'Libro', ejemplares: 2, ejemplaresComprometidos: 0, activo: true },
    { id: 6, titulo: 'Introducción a la programación', autor: 'Autor4', categoria: 'Informática y programación', tipo: 'Libro electrónico (e-book)', ejemplares: 3, ejemplaresComprometidos: 0, activo: true },
    { id: 7, titulo: 'Atlas de Chile', autor: 'Autor5', categoria: 'Geografía', tipo: 'Mapa / Atlas', ejemplares: 1, ejemplaresComprometidos: 1, activo: true }
  ];

  private ultimoId = 7;

  constructor(private loginService: LoginService) {}

  getRecursos(): Observable<IRecurso[]> {
    return of([...this.recursos].sort((a, b) => a.titulo.localeCompare(b.titulo)));
  }

  getRecurso(id: number): IRecurso | undefined {
    return this.recursos.find(recurso => recurso.id === id);
  }

  crearRecurso(datos: IRecursoForm): Observable<IResultadoRecurso> {
    if (!this.loginService.isAdmin()) return of({ ok: false, errores: ['Solo un administrador puede crear recursos.'] });
    const errores = this.validar(datos, null);
    if (errores.length) return of({ ok: false, errores });

    const nuevo: IRecurso = {
      id: ++this.ultimoId,
      titulo: datos.titulo.trim(), autor: datos.autor.trim(), categoria: datos.categoria.trim(), tipo: datos.tipo,
      ejemplares: Number(datos.ejemplares), ejemplaresComprometidos: 0, activo: true
    };
    this.recursos.push(nuevo);
    return of({ ok: true, errores: [], recurso: nuevo });
  }

  actualizarRecurso(id: number, datos: IRecursoForm): Observable<IResultadoRecurso> {
    if (!this.loginService.isAdmin()) return of({ ok: false, errores: ['Solo un administrador puede editar recursos.'] });
    const actual = this.getRecurso(id);
    if (!actual) return of({ ok: false, errores: ['El recurso no existe.'] });
    const errores = this.validar(datos, actual);
    if (errores.length) return of({ ok: false, errores });

    actual.titulo = datos.titulo.trim(); actual.autor = datos.autor.trim(); actual.categoria = datos.categoria.trim();
    actual.tipo = datos.tipo; actual.ejemplares = Number(datos.ejemplares);
    return of({ ok: true, errores: [], recurso: actual });
  }

  darDeBaja(id: number): Observable<IResultadoRecurso> {
    if (!this.loginService.isAdmin()) return of({ ok: false, errores: ['Solo un administrador puede dar de baja recursos.'] });
    const recurso = this.getRecurso(id);
    if (!recurso) return of({ ok: false, errores: ['El recurso no existe.'] });
    if (!recurso.activo) return of({ ok: false, errores: ['El recurso ya está dado de baja.'] });
    if (recurso.ejemplaresComprometidos > 0) return of({ ok: false, errores: ['No se puede dar de baja: existen reservas o préstamos activos asociados al recurso.'] });
    recurso.activo = false;
    return of({ ok: true, errores: [], recurso });
  }

  reactivar(id: number): Observable<IResultadoRecurso> {
    if (!this.loginService.isAdmin()) return of({ ok: false, errores: ['Solo un administrador puede reactivar recursos.'] });
    const recurso = this.getRecurso(id);
    if (!recurso) return of({ ok: false, errores: ['El recurso no existe.'] });
    if (recurso.activo) return of({ ok: false, errores: ['El recurso ya está activo.'] });
    recurso.activo = true;
    return of({ ok: true, errores: [], recurso });
  }

  validar(datos: IRecursoForm, actual: IRecurso | null): string[] {
    const errores: string[] = [];
    const titulo = (datos.titulo || '').trim();
    const autor = (datos.autor || '').trim();
    const categoria = (datos.categoria || '').trim();
    const ejemplares = Number(datos.ejemplares);

    if (titulo.length < 2) errores.push('El título debe tener al menos 2 caracteres.');
    if (autor.length < 2) errores.push('Ingresa el autor del recurso.');
    if (categoria.length < 2) errores.push('Ingresa una categoría válida.');
    if (!datos.tipo) errores.push('Selecciona un tipo de recurso.');
    if (datos.ejemplares === null || datos.ejemplares === undefined || isNaN(ejemplares)) errores.push('Ingresa la cantidad de ejemplares.');
    else if (!Number.isInteger(ejemplares)) errores.push('La cantidad de ejemplares debe ser un número entero.');
    else if (ejemplares < 1) errores.push('Debe existir al menos 1 ejemplar.');
    else if (actual && ejemplares < actual.ejemplaresComprometidos) errores.push('No puedes reducir los ejemplares por debajo de los movimientos activos.');

    const duplicado = this.recursos.find(r => r.titulo.trim().toLowerCase() === titulo.toLowerCase() && r.autor.trim().toLowerCase() === autor.toLowerCase() && (!actual || r.id !== actual.id));
    if (titulo && autor && duplicado) errores.push('Ya existe un recurso con el mismo título y autor.');
    return errores;
  }
    // Registrar una reserva para el usuario que inició sesión
  reservarRecurso(id: number): Observable<IResultadoRecurso> {

    const usuario = this.loginService.getUsuarioActual();

    if (!usuario) {
      return of({
        ok: false,
        errores: ['Debes iniciar sesión para reservar.']
      });
    }

    if (this.loginService.isAdmin()) {
      return of({
        ok: false,
        errores: ['El administrador no puede reservar recursos.']
      });
    }

    const recurso = this.getRecurso(id);

    if (!recurso || !recurso.activo) {
      return of({
        ok: false,
        errores: ['El recurso no existe o no está disponible.']
      });
    }

    // Evitar que el mismo usuario reserve dos veces el mismo recurso
    if (usuario.librosPedidos.includes(id)) {
      return of({
        ok: false,
        errores: ['Ya tienes una reserva de este recurso.']
      });
    }

    // Verificar los ejemplares disponibles
    const disponibles =
      recurso.ejemplares - recurso.ejemplaresComprometidos;

    if (disponibles <= 0) {
      return of({
        ok: false,
        errores: ['No quedan ejemplares disponibles.']
      });
    }

    // Registrar la reserva
    usuario.librosPedidos.push(id);
    recurso.ejemplaresComprometidos++;

    return of({
      ok: true,
      errores: [],
      recurso
    });
  }

  // HU-A05: libera una copia que estaba prestada.
  liberarEjemplar(id: number): boolean {
    const recurso = this.getRecurso(id);
    if (!recurso || recurso.ejemplaresComprometidos <= 0) return false;
    recurso.ejemplaresComprometidos--;
    return true;
  }

  // Consultar las reservas del usuario actual
  getMisRecursosReservados(): IRecurso[] {

    const usuario = this.loginService.getUsuarioActual();

    if (!usuario) {
      return [];
    }

    return usuario.librosPedidos
      .map(id => this.getRecurso(id))
      .filter((recurso): recurso is IRecurso => !!recurso);
  }
}
