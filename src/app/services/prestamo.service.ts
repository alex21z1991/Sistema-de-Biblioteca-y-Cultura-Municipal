
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

import { EstadoReserva, IReserva } from '../interfaces/ireserva';
import { IRecurso } from '../interfaces/irecurso';
import { IUser } from '../interfaces/iuser';

import { CatalogoService } from './catalogo.service';
import { LoginService } from './login.service';
import { MultasService } from './multas.service';
import { ReservaService } from './reserva.service';

@Injectable({ providedIn: 'root' })
export class PrestamoService {

    // Préstamos almacenados en memoria
    private prestamos: IPrestamo[] = [];
    private ultimoId = 0;

    constructor(
        private loginService: LoginService,
        private catalogoService: CatalogoService,
        private multasService: MultasService,
        private reservaService: ReservaService
    ) {
        this.cargarDatosDePrueba();
    }

    private cargarDatosDePrueba(): void {
        const reserva = this.reservaService.getReserva(1);

        if (!reserva || reserva.estado !== EstadoReserva.Retirada) {
            return;
        }

        const fechaPrestamo = reserva.fechaRetiroReal ?? reserva.fechaRetiro;

        this.prestamos.push({
            id: ++this.ultimoId,
            usuarioId: reserva.usuarioId,
            usuarioNombre: 'alex',
            recursoId: reserva.recursoId,
            recursoTitulo: reserva.tituloRecurso,
            fechaPrestamo,
            fechaDevolucion: this.sumarDias(fechaPrestamo, 14),
            estado: EstadoPrestamo.Prestado,
            reservaId: reserva.id,
            reservaCodigo: reserva.codigo
        });
    }

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

    // Préstamos aún no devueltos del ciudadano en sesión
    public getMisPrestamosActivos(): Observable<IPrestamo[]> {
        const usuario = this.loginService.getUsuarioActual();

        if (!usuario || usuario.role !== 'usuario') {
            return of([]);
        }

        return of(
            this.prestamosActivosDe(usuario.id)
                .sort((a, b) => b.id - a.id)
                .map(p => ({ ...p }))
        );
    }

    private tienePrestamoActivo(
        usuarioId: number,
        recursoId: number
    ): boolean {
        return this.prestamos.some(p =>
            p.usuarioId === usuarioId &&
            p.recursoId === recursoId &&
            p.estado === EstadoPrestamo.Prestado
        );
    }

    // --------------------------------------------------
    // HU-A05: REGISTRAR DEVOLUCIÓN
    // --------------------------------------------------

    public registrarDevolucion(id: number): string {

        if (!this.loginService.isAdmin()) {
            return 'Solo el administrador puede registrar devoluciones.';
        }

        const prestamo = this.prestamos.find(p => p.id === id);

        if (!prestamo) {
            return 'El préstamo no existe.';
        }

        if (prestamo.estado === EstadoPrestamo.Devuelto) {
            return 'Este libro ya fue devuelto.';
        }

        // Liberar el ejemplar en el catálogo
        if (!this.catalogoService.liberarEjemplar(prestamo.recursoId)) {
            return 'No se pudo liberar el ejemplar.';
        }

        prestamo.estado = EstadoPrestamo.Devuelto;
        prestamo.fechaDevolucionReal = this.hoy();

        // Actualizar el resumen del ciudadano
        const usuario = this.loginService.getCiudadanos()
            .find(u => u.id === prestamo.usuarioId);

        if (usuario && !this.tienePrestamoActivo(usuario.id, prestamo.recursoId)) {
            usuario.librosPedidos = usuario.librosPedidos
                .filter(id => id !== prestamo.recursoId);
        }

        return 'Devolución registrada correctamente.';
    }

    // --------------------------------------------------
    // FECHAS
    // --------------------------------------------------

    public hoy(): string {
        return this.aTexto(new Date());
    }

    public sumarDias(fecha: string, dias: number): string {
        const [anio, mes, dia] = fecha.split('-').map(Number);

        return this.aTexto(
            new Date(anio, mes - 1, dia + dias)
        );
    }

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

        const multas = this.multasService.contarPendientes(usuario);

        if (multas > 0) {
            return {
                ok: false,
                motivo: 'Tiene ' + this.multasService.textoPendientes(multas)
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

    // Verificar que una reserva se pueda entregar
    public estadoReserva(reserva: IReserva): IEstadoPrestamo {

        if (reserva.estado === EstadoReserva.Retirada) {
            return { ok: false, motivo: 'Ya fue retirada' };
        }

        if (reserva.estado === EstadoReserva.Cancelada) {
            return { ok: false, motivo: 'Fue cancelada' };
        }

        const usuario = this.loginService.getCiudadanos()
            .find(u => u.id === reserva.usuarioId);

        if (!usuario) {
            return { ok: false, motivo: 'El ciudadano no existe' };
        }

        return this.estadoCiudadano(usuario);
    }

    // --------------------------------------------------
    // VALIDACIÓN
    // --------------------------------------------------

    // Validar préstamo directo
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

                // Comprobar si existe una reserva pendiente
                const reserva =
                    datos.usuarioId !== null && datos.usuarioId !== undefined
                        ? this.reservaService.getReservaPendienteDe(
                            datos.usuarioId,
                            recurso.id
                        )
                        : undefined;

                if (reserva) {
                    errores.push(
                        'El ciudadano tiene la reserva ' +
                        reserva.codigo +
                        ' de "' +
                        recurso.titulo +
                        '". Regístralo desde "Retiro de reserva".'
                    );

                } else {

                    const estado = this.estadoRecurso(recurso);

                    if (!estado.ok) {
                        errores.push(
                            'No se puede prestar "' +
                            recurso.titulo + '": ' +
                            estado.motivo.toLowerCase() + '.'
                        );
                    }
                }

                // Evitar préstamos duplicados
                if (
                    datos.usuarioId !== null &&
                    this.tienePrestamoActivo(datos.usuarioId, recurso.id)
                ) {
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

    // Validar préstamo a partir de una reserva
    public validarRetiro(
        reservaId: number | null,
        fechaDevolucion: string
    ): string[] {

        const errores: string[] = [];

        if (reservaId === null || reservaId === undefined) {

            errores.push('Selecciona la reserva que se va a entregar.');

        } else {

            const reserva = this.reservaService.getReserva(reservaId);

            if (!reserva) {

                errores.push('La reserva no existe.');

            } else {

                const estado = this.estadoReserva(reserva);

                if (!estado.ok) {
                    errores.push(
                        'No se puede entregar la reserva ' +
                        reserva.codigo + ': ' +
                        estado.motivo.toLowerCase() + '.'
                    );
                }

                if (!this.catalogoService.getRecurso(reserva.recursoId)) {
                    errores.push(
                        'El recurso de la reserva ya no existe en el catálogo.'
                    );
                }

                if (
                    this.tienePrestamoActivo(
                        reserva.usuarioId,
                        reserva.recursoId
                    )
                ) {
                    errores.push(
                        'El ciudadano ya tiene este recurso en préstamo.'
                    );
                }
            }
        }

        return errores.concat(
            this.validarFecha(fechaDevolucion)
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

        if (!this.loginService.isAdmin()) {
            return of({
                ok: false,
                errores: [
                    'Inicia sesión como administrador para registrar préstamos.'
                ]
            });
        }

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

        return of({
            ok: true,
            errores: [],
            prestamo: this.crearPrestamo(
                usuario,
                recurso,
                datos.fechaDevolucion
            )
        });
    }

    // --------------------------------------------------
    // HU11: RETIRO DE RESERVA
    // --------------------------------------------------

    public registrarPrestamoDesdeReserva(
        reservaId: number | null,
        fechaDevolucion: string
    ): Observable<IResultadoPrestamo> {

        if (!this.loginService.isAdmin()) {
            return of({
                ok: false,
                errores: [
                    'Inicia sesión como administrador para registrar préstamos.'
                ]
            });
        }

        const errores = this.validarRetiro(
            reservaId,
            fechaDevolucion
        );

        if (errores.length > 0) {
            return of({
                ok: false,
                errores: errores
            });
        }

        const reserva = this.reservaService.getReserva(reservaId!)!;

        const usuario = this.loginService.getCiudadanos()
            .find(u => u.id === reserva.usuarioId)!;

        const recurso = this.catalogoService
            .getRecurso(reserva.recursoId)!;

        // El ejemplar ya está comprometido por la reserva.
        // No se debe descontar otro ejemplar.
        if (!this.reservaService.marcarRetirada(reserva.id)) {
            return of({
                ok: false,
                errores: [
                    'No se pudo marcar la reserva ' +
                    reserva.codigo +
                    ' como retirada.'
                ]
            });
        }

        return of({
            ok: true,
            errores: [],
            prestamo: this.crearPrestamo(
                usuario,
                recurso,
                fechaDevolucion,
                reserva
            )
        });
    }

    // --------------------------------------------------
    // CREACIÓN COMÚN DE PRÉSTAMOS
    // --------------------------------------------------

    private crearPrestamo(
        usuario: IUser,
        recurso: IRecurso,
        fechaDevolucion: string,
        reserva?: IReserva
    ): IPrestamo {

        const prestamo: IPrestamo = {
            id: ++this.ultimoId,
            usuarioId: usuario.id,
            usuarioNombre: usuario.username,
            recursoId: recurso.id,
            recursoTitulo: recurso.titulo,
            fechaPrestamo: this.hoy(),
            fechaDevolucion: fechaDevolucion,
            estado: EstadoPrestamo.Prestado,
            reservaId: reserva?.id,
            reservaCodigo: reserva?.codigo
        };

        this.prestamos.push(prestamo);

        // Actualizar el resumen del ciudadano
        if (!usuario.librosPedidos.includes(recurso.id)) {
            usuario.librosPedidos.push(recurso.id);
        }

        return prestamo;
    }
}
