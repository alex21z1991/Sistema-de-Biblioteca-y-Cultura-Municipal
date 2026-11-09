
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

    // Préstamos almacenados en memoria
    private prestamos: IPrestamo[] = [];
    private ultimoId = 0;

    constructor(
        private loginService: LoginService,
        private catalogoService: CatalogoService
    ) {}


    // --------------------------------------------------
    // CONSULTAS
    // --------------------------------------------------

    // Obtener préstamos ordenados del más reciente al más antiguo
    public getPrestamos(): Observable<IPrestamo[]> {
        return of(
            [...this.prestamos].sort((a, b) => b.id - a.id)
        );
    }

    // Obtener préstamos activos de un ciudadano
    public prestamosActivosDe(usuarioId: number): IPrestamo[] {
        return this.prestamos.filter(
            p => p.usuarioId === usuarioId &&
                 p.estado === EstadoPrestamo.Prestado
        );
    }


    // --------------------------------------------------
    // HU-A05: REGISTRAR DEVOLUCIÓN
    // --------------------------------------------------

    public registrarDevolucion(id: number): string {

        // Verificar que el usuario sea administrador
        if (!this.loginService.isAdmin()) {
            return 'Solo el administrador puede registrar devoluciones.';
        }

        // Buscar el préstamo
        const prestamo = this.prestamos.find(p => p.id === id);

        if (!prestamo) {
            return 'El préstamo no existe.';
        }

        // Verificar que todavía no esté devuelto
        if (prestamo.estado === EstadoPrestamo.Devuelto) {
            return 'Este libro ya fue devuelto.';
        }

        // Liberar el ejemplar en el catálogo
        if (!this.catalogoService.liberarEjemplar(prestamo.recursoId)) {
            return 'No se pudo liberar el ejemplar.';
        }

        // Cambiar el estado del préstamo
        prestamo.estado = EstadoPrestamo.Devuelto;

        // Actualizar el resumen del ciudadano
        const usuario = this.loginService.getCiudadanos()
            .find(u => u.id === prestamo.usuarioId);

        if (usuario) {

            // Comprobar si mantiene otro préstamo activo
            // del mismo recurso
            const siguePrestado = this.prestamos.some(p =>
                p.usuarioId === usuario.id &&
                p.recursoId === prestamo.recursoId &&
                p.estado === EstadoPrestamo.Prestado
            );

            // Si no tiene otro préstamo activo,
            // quitar el recurso de sus libros pedidos
            if (!siguePrestado) {
                usuario.librosPedidos = usuario.librosPedidos
                    .filter(id => id !== prestamo.recursoId);
            }
        }

        return 'Devolución registrada correctamente.';
    }


    // --------------------------------------------------
    // FECHAS
    // --------------------------------------------------

    // Obtener la fecha actual en formato YYYY-MM-DD
    public hoy(): string {
        return this.aTexto(new Date());
    }

    // Sumar días a una fecha
    public sumarDias(fecha: string, dias: number): string {
        const [anio, mes, dia] = fecha.split('-').map(Number);

        return this.aTexto(
            new Date(anio, mes - 1, dia + dias)
        );
    }

    // Convertir una fecha a texto
    private aTexto(fecha: Date): string {
        const mm = String(fecha.getMonth() + 1).padStart(2, '0');
        const dd = String(fecha.getDate()).padStart(2, '0');

        return `${fecha.getFullYear()}-${mm}-${dd}`;
    }


    // --------------------------------------------------
    // PRECONDICIONES
    // --------------------------------------------------

    // Verificar que el ciudadano esté habilitado y sin multas
    public estadoCiudadano(usuario: IUser): IEstadoPrestamo {

        if (usuario.habilitado === false) {
            return {
                ok: false,
                motivo: 'Cuenta inhabilitada'
            };
        }

        const multas = usuario.multas.length;

        if (multas > 0) {
            return {
                ok: false,
                motivo: multas === 1
                    ? 'Tiene 1 multa pendiente'
                    : 'Tiene ' + multas + ' multas pendientes'
            };
        }

        return {
            ok: true,
            motivo: ''
        };
    }

    // Verificar que el recurso esté activo y tenga ejemplares disponibles
    public estadoRecurso(recurso: IRecurso): IEstadoPrestamo {

        if (!recurso.activo) {
            return {
                ok: false,
                motivo: 'Dado de baja'
            };
        }

        if (recurso.ejemplares - recurso.ejemplaresComprometidos <= 0) {
            return {
                ok: false,
                motivo: 'Sin ejemplares disponibles'
            };
        }

        return {
            ok: true,
            motivo: ''
        };
    }


    // --------------------------------------------------
    // VALIDACIÓN
    // --------------------------------------------------

    public validar(datos: IPrestamoForm): string[] {

        const errores: string[] = [];

        // Validar ciudadano
        if (datos.usuarioId === null || datos.usuarioId === undefined) {

            errores.push('Selecciona un ciudadano.');

        } else {

            const usuario = this.loginService.getCiudadanos()
                .find(u => u.id === datos.usuarioId);

            if (!usuario) {

                errores.push('El ciudadano seleccionado no existe.');

            } else {

                const estado = this.estadoCiudadano(usuario);

                if (!estado.ok) {
                    errores.push(
                        'No se puede prestar a ' +
                        usuario.username + ': ' +
                        estado.motivo.toLowerCase() + '.'
                    );
                }
            }
        }

        // Validar recurso
        if (datos.recursoId === null || datos.recursoId === undefined) {

            errores.push('Selecciona el recurso que se va a prestar.');

        } else {

            const recurso = this.catalogoService.getRecurso(datos.recursoId);

            if (!recurso) {

                errores.push('El recurso seleccionado no existe.');

            } else {

                const estado = this.estadoRecurso(recurso);

                if (!estado.ok) {
                    errores.push(
                        'No se puede prestar "' +
                        recurso.titulo + '": ' +
                        estado.motivo.toLowerCase() + '.'
                    );
                }

                // Evitar dos préstamos activos del mismo recurso
                // para un mismo ciudadano
                const repetido = datos.usuarioId !== null &&
                    this.prestamos.some(
                        p =>
                            p.usuarioId === datos.usuarioId &&
                            p.recursoId === datos.recursoId &&
                            p.estado === EstadoPrestamo.Prestado
                    );

                if (repetido) {
                    errores.push(
                        'El ciudadano ya tiene este recurso en préstamo.'
                    );
                }
            }
        }

        // Validar fecha de devolución
        return errores.concat(
            this.validarFecha(datos.fechaDevolucion)
        );
    }

    // Validar fecha de devolución
    private validarFecha(fechaDevolucion: string): string[] {

        if (!fechaDevolucion) {
            return ['Selecciona la fecha de devolución.'];
        }

        const valida =
            /^\d{4}-\d{2}-\d{2}$/.test(fechaDevolucion) &&
            !isNaN(
                new Date(fechaDevolucion + 'T00:00').getTime()
            );

        if (!valida) {
            return ['La fecha de devolución no es válida.'];
        }

        const hoy = this.hoy();

        if (fechaDevolucion <= hoy) {
            return [
                'La fecha de devolución debe ser posterior a hoy.'
            ];
        }

        if (
            fechaDevolucion >
            this.sumarDias(hoy, DIAS_PRESTAMO_MAXIMO)
        ) {
            return [
                'El préstamo no puede superar los ' +
                DIAS_PRESTAMO_MAXIMO +
                ' días.'
            ];
        }

        return [];
    }


    // --------------------------------------------------
    // HU-A03: REGISTRAR PRÉSTAMO DIRECTO
    // --------------------------------------------------

    public registrarPrestamo(
        datos: IPrestamoForm
    ): Observable<IResultadoPrestamo> {

        // Verificar que el usuario sea administrador
        if (!this.loginService.isAdmin()) {
            return of({
                ok: false,
                errores: [
                    'Inicia sesión como administrador para registrar préstamos.'
                ]
            });
        }

        // Validar los datos del préstamo
        const errores = this.validar(datos);

        if (errores.length > 0) {
            return of({
                ok: false,
                errores: errores
            });
        }

        const usuario = this.loginService.getCiudadanos()
            .find(u => u.id === datos.usuarioId)!;

        const recurso = this.catalogoService
            .getRecurso(datos.recursoId!)!;

        // Comprometer un ejemplar del catálogo
        if (!this.catalogoService.comprometerEjemplar(recurso.id)) {
            return of({
                ok: false,
                errores: [
                    'No quedan ejemplares disponibles de "' +
                    recurso.titulo + '".'
                ]
            });
        }

        // Crear el préstamo
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

        // Guardar el préstamo
        this.prestamos.push(prestamo);

        // Actualizar el resumen del ciudadano
        if (!usuario.librosPedidos.includes(recurso.id)) {
            usuario.librosPedidos.push(recurso.id);
        }

        return of({
            ok: true,
            errores: [],
            prestamo: prestamo
        });
    }
}
