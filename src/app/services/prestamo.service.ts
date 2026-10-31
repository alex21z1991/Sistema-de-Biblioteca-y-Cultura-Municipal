import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import {
    DIAS_PRESTAMO_MAXIMO,
    EstadoPrestamo,
    IEstadoPrestamo,
    IPrestamo,
    IPrestamoForm,
    IResultadoPrestamo
} from '../interfaces/iprestamo';
import { IRecurso } from '../interfaces/irecurso';
import { IUser } from '../interfaces/iuser';

import { CatalogoService } from './catalogo.service';
import { LoginService } from './login.service';

@Injectable({ providedIn: 'root' })
export class PrestamoService {

    // Préstamos en memoria (mismo enfoque que el resto de los servicios)
    private prestamos: IPrestamo[] = [];
    private ultimoId = 0;

    constructor(
        private loginService: LoginService,
        private catalogoService: CatalogoService
    ) {}


    // ------------------------------------------------------------------
    // Consultas
    // ------------------------------------------------------------------

    // Más recientes primero
    public getPrestamos(): Observable<IPrestamo[]> {
        return of([...this.prestamos].sort((a, b) => b.id - a.id));
    }

    // actualizar el prestamo original, no una lista de demostración.
    public registrarDevolucion(id: number): string {
        if (!this.loginService.isAdmin()) return 'Solo el administrador puede registrar devoluciones.';
        const prestamo = this.prestamos.find(p => p.id === id);
        if (!prestamo) return 'El préstamo no existe.';
        if (prestamo.estado === EstadoPrestamo.Devuelto) return 'Este libro ya fue devuelto.';
        if (!this.catalogoService.liberarEjemplar(prestamo.recursoId)) return 'No se pudo liberar el ejemplar.';

        prestamo.estado = EstadoPrestamo.Devuelto;
        const usuario = this.loginService.getCiudadanos().find(u => u.id === prestamo.usuarioId);
        if (usuario) {
            const siguePrestado = this.prestamos.some(p =>
                p.usuarioId === usuario.id && p.recursoId === prestamo.recursoId &&
                p.estado === EstadoPrestamo.Prestado
            );
            if (!siguePrestado) {
                usuario.librosPedidos = usuario.librosPedidos.filter(id => id !== prestamo.recursoId);
            }
        }
        return 'Devolución registrada correctamente.';
    }

    public prestamosActivosDe(usuarioId: number): IPrestamo[] {
        return this.prestamos.filter(
            p => p.usuarioId === usuarioId && p.estado === EstadoPrestamo.Prestado
        );
    }


    // ------------------------------------------------------------------
    // Fechas ('YYYY-MM-DD', hora local)
    // ------------------------------------------------------------------

    public hoy(): string {
        return this.aTexto(new Date());
    }

    public sumarDias(fecha: string, dias: number): string {
        const [anio, mes, dia] = fecha.split('-').map(Number);
        return this.aTexto(new Date(anio, mes - 1, dia + dias));
    }

    private aTexto(fecha: Date): string {
        const mm = String(fecha.getMonth() + 1).padStart(2, '0');
        const dd = String(fecha.getDate()).padStart(2, '0');
        return `${fecha.getFullYear()}-${mm}-${dd}`;
    }


    // ------------------------------------------------------------------
    // Precondiciones
    // ------------------------------------------------------------------

    // Ciudadano habilitado y sin bloqueos (multas pendientes)
    public estadoCiudadano(usuario: IUser): IEstadoPrestamo {

        if (usuario.habilitado === false) {
            return { ok: false, motivo: 'Cuenta inhabilitada' };
        }

        const multas = usuario.multas.length;

        if (multas > 0) {
            return {
                ok: false,
                motivo: multas === 1 ? 'Tiene 1 multa pendiente' : 'Tiene ' + multas + ' multas pendientes'
            };
        }

        return { ok: true, motivo: '' };
    }

    // Recurso activo y con al menos un ejemplar disponible
    public estadoRecurso(recurso: IRecurso): IEstadoPrestamo {

        if (!recurso.activo) {
            return { ok: false, motivo: 'Dado de baja' };
        }

        if (recurso.ejemplares - recurso.ejemplaresComprometidos <= 0) {
            return { ok: false, motivo: 'Sin ejemplares disponibles' };
        }

        return { ok: true, motivo: '' };
    }


    // ------------------------------------------------------------------
    // Validación (devuelve la lista de errores; vacía = todo en orden)
    // ------------------------------------------------------------------

    public validar(datos: IPrestamoForm): string[] {

        const errores: string[] = [];

        // ----- Ciudadano -----
        if (datos.usuarioId === null || datos.usuarioId === undefined) {
            errores.push('Selecciona un ciudadano.');

        } else {
            const usuario = this.loginService.getCiudadanos().find(u => u.id === datos.usuarioId);

            if (!usuario) {
                errores.push('El ciudadano seleccionado no existe.');

            } else {
                const estado = this.estadoCiudadano(usuario);

                if (!estado.ok) {
                    errores.push('No se puede prestar a ' + usuario.username + ': ' + estado.motivo.toLowerCase() + '.');
                }
            }
        }

        // ----- Recurso -----
        if (datos.recursoId === null || datos.recursoId === undefined) {
            errores.push('Selecciona el recurso que se va a prestar.');

        } else {
            const recurso = this.catalogoService.getRecurso(datos.recursoId);

            if (!recurso) {
                errores.push('El recurso seleccionado no existe.');

            } else {
                const estado = this.estadoRecurso(recurso);

                if (!estado.ok) {
                    errores.push('No se puede prestar "' + recurso.titulo + '": ' + estado.motivo.toLowerCase() + '.');
                }

                // El mismo ciudadano no puede tener dos préstamos activos del mismo recurso
                const repetido = datos.usuarioId !== null && this.prestamos.some(
                    p => p.usuarioId === datos.usuarioId &&
                         p.recursoId === datos.recursoId &&
                         p.estado === EstadoPrestamo.Prestado
                );

                if (repetido) {
                    errores.push('El ciudadano ya tiene este recurso en préstamo.');
                }
            }
        }

        // ----- Fecha de devolución -----
        return errores.concat(this.validarFecha(datos.fechaDevolucion));
    }

    private validarFecha(fechaDevolucion: string): string[] {

        if (!fechaDevolucion) {
            return ['Selecciona la fecha de devolución.'];
        }

        const valida = /^\d{4}-\d{2}-\d{2}$/.test(fechaDevolucion) &&
            !isNaN(new Date(fechaDevolucion + 'T00:00').getTime());

        if (!valida) {
            return ['La fecha de devolución no es válida.'];
        }

        const hoy = this.hoy();

        if (fechaDevolucion <= hoy) {
            return ['La fecha de devolución debe ser posterior a hoy.'];
        }

        if (fechaDevolucion > this.sumarDias(hoy, DIAS_PRESTAMO_MAXIMO)) {
            return ['El préstamo no puede superar los ' + DIAS_PRESTAMO_MAXIMO + ' días.'];
        }

        return [];
    }


    // ------------------------------------------------------------------
    // HU-A03: registrar préstamo directo
    // ------------------------------------------------------------------

    public registrarPrestamo(datos: IPrestamoForm): Observable<IResultadoPrestamo> {

        // Precondición: sesión administrativa
        if (!this.loginService.isAdmin()) {
            return of({
                ok: false,
                errores: ['Inicia sesión como administrador para registrar préstamos.']
            });
        }

        const errores = this.validar(datos);

        if (errores.length > 0) {
            return of({ ok: false, errores: errores });
        }

        const usuario = this.loginService.getCiudadanos().find(u => u.id === datos.usuarioId)!;
        const recurso = this.catalogoService.getRecurso(datos.recursoId!)!;

        // Descuenta un ejemplar del catálogo (evita dar de baja el recurso mientras esté prestado)
        if (!this.catalogoService.comprometerEjemplar(recurso.id)) {
            return of({ ok: false, errores: ['No quedan ejemplares disponibles de "' + recurso.titulo + '".'] });
        }

        const prestamo: IPrestamo = {
            id: ++this.ultimoId,
            usuarioId: usuario.id,
            usuarioNombre: usuario.username,
            recursoId: recurso.id,
            recursoTitulo: recurso.titulo,
            fechaPrestamo: this.hoy(),
            fechaDevolucion: datos.fechaDevolucion,
            estado: EstadoPrestamo.Prestado
        };

        this.prestamos.push(prestamo);

        // Se refleja en el resumen del ciudadano (inicio)
        if (!usuario.librosPedidos.includes(recurso.id)) {
            usuario.librosPedidos.push(recurso.id);
        }

        return of({ ok: true, errores: [], prestamo: prestamo });
    }
}
