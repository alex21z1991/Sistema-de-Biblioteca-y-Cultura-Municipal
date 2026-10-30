import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';

import { CartResult } from '../interfaces/cart';
import { IRecurso } from '../interfaces/irecurso';
import {
    EstadoReserva,
    IConfirmarReservaDto,
    IReserva,
    IResultadoReserva,
    IPrestamo,
    IResultadoEntrega
} from '../interfaces/ireserva';

import { CatalogoService } from './catalogo.service';
import { LoginService } from './login.service';

// Reglas de negocio de la HU-C05
export const MAX_RESERVAS_ACTIVAS = 5;   // recursos reservados a la vez por ciudadano
export const DIAS_MAXIMOS_RETIRO = 5;    // plazo máximo para retirar desde hoy
const LATENCIA_SIMULADA = 500;           // ms, para ver el estado de carga

@Injectable({ providedIn: 'root' })
export class ReservaService {

    // Cada ciudadano conserva su carrito mientras la aplicación está abierta.
    private selectionsByUser = new BehaviorSubject<Record<number, number[]>>({});
    readonly seleccion$ = combineLatest([
        this.loginService.currentUser$,
        this.selectionsByUser
    ]).pipe(map(([user, selections]) =>
        user?.role === 'usuario' ? [...(selections[user.id] ?? [])] : []
    ));

    // Reservas confirmadas en memoria (mismo enfoque que los otros servicios)
    private reservas: IReserva[] = [];
    private ultimoId = 0;

    // Préstamos activos generados al entregar reservas.
    // HU-A03 podrá agregar préstamos directos y HU-A05 podrá cerrarlos.
    private prestamos: IPrestamo[] = [];
    private ultimoPrestamoId = 0;
    private readonly reservasStorageKey = 'biblioteca.reservas';
    private readonly prestamosStorageKey = 'biblioteca.prestamos';
    private readonly browser: boolean;

    constructor(
        private catalogoService: CatalogoService,
        private loginService: LoginService,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.browser = isPlatformBrowser(platformId);
        this.cargarPersistencia();
    }


    // ------------------------------------------------------------------
    // Selección de recursos (antes de confirmar)
    // ------------------------------------------------------------------

    public getSeleccionIds(): number[] {
        const user = this.loginService.getUsuarioActual();
        return user?.role === 'usuario'
            ? [...(this.selectionsByUser.value[user.id] ?? [])]
            : [];
    }

    public agregarASeleccion(recursoId: number): CartResult {
        const user = this.loginService.getUsuarioActual();
        if (!user || user.role !== 'usuario') {
            return { ok: false, errors: ['Inicia sesión como ciudadano para agregar recursos al carrito.'] };
        }

        const resource = this.catalogoService.getRecurso(recursoId);
        if (!resource || !resource.activo) {
            return { ok: false, errors: ['El recurso no está disponible en el catálogo.'] };
        }
        if (this.disponibles(resource) === 0) {
            return { ok: false, errors: ['No quedan ejemplares disponibles de este recurso.'] };
        }
        if (user.librosPedidos.includes(recursoId)) {
            return { ok: false, errors: ['Ya tienes una reserva de este recurso.'] };
        }

        const ids = this.getSeleccionIds();
        if (ids.includes(recursoId)) {
            return { ok: false, errors: ['Este recurso ya está en tu carrito.'] };
        }

        this.updateSelection([...ids, recursoId]);
        return { ok: true, errors: [] };
    }

    public quitarDeSeleccion(recursoId: number): void {
        this.updateSelection(this.getSeleccionIds().filter(id => id !== recursoId));
    }

    public limpiarSeleccion(): void {
        this.updateSelection([]);
    }

    private updateSelection(ids: number[]): void {
        const user = this.loginService.getUsuarioActual();
        if (user?.role === 'usuario') {
            this.selectionsByUser.next({ ...this.selectionsByUser.value, [user.id]: ids });
        }
    }

    // Recursos de la selección con sus datos completos, listos para el resumen
    public getResumenSeleccion(): Observable<IRecurso[]> {
        const recursos = this.getSeleccionIds()
            .map(id => this.catalogoService.getRecurso(id))
            .filter((recurso): recurso is IRecurso => !!recurso);

        return of(recursos).pipe(delay(LATENCIA_SIMULADA));
    }

    // Avisos antes de confirmar la reserva.
    public getCartWarnings(): string[] {
        const user = this.loginService.getUsuarioActual();
        if (!user || user.role !== 'usuario') {
            return [];
        }

        const warnings: string[] = [];
        if (user.multas.length > 0) {
            warnings.push(
                'Tienes ' + user.multas.length + ' multa(s) pendiente(s). ' +
                'Regulariza tu situación antes de confirmar la reserva.'
            );
        }

        const active = user.librosPedidos.length;
        const excess = active + this.getSeleccionIds().length - MAX_RESERVAS_ACTIVAS;
        if (excess > 0) {
            warnings.push(
                'Puedes tener como máximo ' + MAX_RESERVAS_ACTIVAS + ' recursos reservados y ya tienes ' + active + '. ' +
                'Quita ' + excess + ' recurso(s) del carrito para continuar.'
            );
        }

        return warnings;
    }

    // Recursos que el ciudadano todavía puede agregar a la selección
    public getRecursosReservables(): IRecurso[] {
        const usuario = this.loginService.getUsuarioActual();
        const yaPedidos = usuario?.librosPedidos ?? [];
        const seleccionados = this.getSeleccionIds();

        let lista: IRecurso[] = [];
        this.catalogoService.getRecursos().subscribe(recursos => lista = recursos);

        return lista.filter(r =>
            r.activo &&
            this.disponibles(r) > 0 &&
            !yaPedidos.includes(r.id) &&
            !seleccionados.includes(r.id)
        );
    }

    public disponibles(recurso: IRecurso): number {
        return Math.max(0, recurso.ejemplares - recurso.ejemplaresComprometidos);
    }


    // ------------------------------------------------------------------
    // Confirmar
    // ------------------------------------------------------------------

    public confirmarReservas(dto: IConfirmarReservaDto): Observable<IResultadoReserva> {

        const errores = this.validar(dto);

        if (errores.length > 0) {
            return of({ ok: false, errores: errores }).pipe(delay(LATENCIA_SIMULADA));
        }

        const usuario = this.loginService.getUsuarioActual()!;
        const hoy = this.fechaLocal(new Date());
        const nuevas: IReserva[] = [];

        for (const recursoId of dto.recursosIds) {
            const recurso = this.catalogoService.getRecurso(recursoId)!;

            const reserva: IReserva = {
                id: ++this.ultimoId,
                codigo: 'RES-' + String(this.ultimoId).padStart(4, '0'),
                usuarioId: usuario.id,
                recursoId: recurso.id,
                tituloRecurso: recurso.titulo,
                fechaSolicitud: hoy,
                fechaRetiro: dto.fechaRetiro,
                estado: EstadoReserva.PendienteRetiro
            };

            // Comprometer un ejemplar y registrar el pedido del ciudadano
            recurso.ejemplaresComprometidos++;
            usuario.librosPedidos.push(recurso.id);

            this.reservas.push(reserva);
            nuevas.push(reserva);
        }

        this.limpiarSeleccion();
        this.guardarPersistencia();

        return of({ ok: true, errores: [], reservas: nuevas }).pipe(delay(LATENCIA_SIMULADA));
    }

    // Reservas confirmadas del ciudadano en sesión
    public getMisReservas(): Observable<IReserva[]> {
        const usuario = this.loginService.getUsuarioActual();

        if (!usuario) {
            return of([]);
        }

        return of(this.reservas.filter(r => r.usuarioId === usuario.id));
    }

    // ------------------------------------------------------------------
    // Entregar reservas (HU-A04)
    // ------------------------------------------------------------------

    // Reservas cuya fecha de retiro ya llegó y que aún no fueron entregadas.
    public getReservasPendientes(): Observable<IReserva[]> {
        if (!this.loginService.isAdmin()) {
            return of([]);
        }

        const pendientes = this.reservas
            .filter(reserva => reserva.estado === EstadoReserva.PendienteRetiro)
            .sort((a, b) => a.fechaRetiro.localeCompare(b.fechaRetiro));

        return of([...pendientes]);
    }

    // Consulta de apoyo para la futura HU-A05 (devolución).
    public getPrestamosActivos(): Observable<IPrestamo[]> {
        if (!this.loginService.isAdmin()) {
            return of([]);
        }

        return of(this.prestamos.filter(prestamo => prestamo.activo));
    }

    public entregarReservas(
        reservaIds: number[],
        fechaDevolucionPrevista: string
    ): Observable<IResultadoEntrega> {
        if (!this.loginService.isAdmin()) {
            return of({
                ok: false,
                errores: ['Solo un administrador puede entregar reservas.']
            });
        }

        const errores: string[] = [];
        const ids = reservaIds ?? [];
        const hoy = this.fechaLocal(new Date());

        if (ids.length === 0) {
            errores.push('Selecciona al menos una reserva para entregar.');
        }

        if (new Set(ids).size !== ids.length) {
            errores.push('Hay reservas repetidas en la selección.');
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaDevolucionPrevista)) {
            errores.push('La fecha de devolución no es válida.');
        } else if (fechaDevolucionPrevista < hoy) {
            errores.push('La fecha de devolución no puede estar en el pasado.');
        }

        const seleccionadas = ids.map(id => this.reservas.find(reserva => reserva.id === id));

        if (seleccionadas.some(reserva => !reserva)) {
            errores.push('Una o más reservas seleccionadas ya no existen.');
        }

        const reservasValidas = seleccionadas.filter(
            (reserva): reserva is IReserva => !!reserva
        );

        for (const reserva of reservasValidas) {
            if (reserva.estado !== EstadoReserva.PendienteRetiro) {
                errores.push('La reserva ' + reserva.codigo + ' ya no está pendiente de retiro.');
            } else if (reserva.fechaRetiro > hoy) {
                errores.push(
                    'La reserva ' + reserva.codigo +
                    ' todavía no está lista para retiro (' + reserva.fechaRetiro + ').'
                );
            }
        }

        // Se valida todo antes de cambiar reservas o crear préstamos.
        if (errores.length > 0) {
            return of({ ok: false, errores });
        }

        const nuevosPrestamos: IPrestamo[] = reservasValidas.map(reserva => {
            const prestamo: IPrestamo = {
                id: ++this.ultimoPrestamoId,
                origen: 'reserva',
                reservaId: reserva.id,
                usuarioId: reserva.usuarioId,
                recursoId: reserva.recursoId,
                tituloRecurso: reserva.tituloRecurso,
                fechaEntrega: hoy,
                fechaDevolucionPrevista,
                activo: true
            };

            reserva.estado = EstadoReserva.Retirada;
            this.prestamos.push(prestamo);
            return prestamo;
        });

        this.guardarPersistencia();

        return of({ ok: true, errores: [], prestamos: nuevosPrestamos });
    }

    private cargarPersistencia(): void {
        if (!this.browser) return;

        try {
            const reservas = localStorage.getItem(this.reservasStorageKey);
            const prestamos = localStorage.getItem(this.prestamosStorageKey);
            this.reservas = reservas ? JSON.parse(reservas) as IReserva[] : [];
            this.prestamos = prestamos ? JSON.parse(prestamos) as IPrestamo[] : [];
            this.ultimoId = this.reservas.reduce((max, reserva) => Math.max(max, reserva.id), 0);
            this.ultimoPrestamoId = this.prestamos.reduce((max, prestamo) => Math.max(max, prestamo.id), 0);
        } catch {
            this.reservas = [];
            this.prestamos = [];
            this.ultimoId = 0;
            this.ultimoPrestamoId = 0;
        }
    }

    private guardarPersistencia(): void {
        if (!this.browser) return;

        localStorage.setItem(this.reservasStorageKey, JSON.stringify(this.reservas));
        localStorage.setItem(this.prestamosStorageKey, JSON.stringify(this.prestamos));
    }


    // ------------------------------------------------------------------
    // Validaciones (excepciones de la HU)
    // ------------------------------------------------------------------
    public validar(dto: IConfirmarReservaDto): string[] {

        const errores: string[] = [];
        const usuario = this.loginService.getUsuarioActual();

        // ----- Precondición: sesión de ciudadano -----
        if (!usuario || usuario.role !== 'usuario') {
            return ['Inicia sesión como ciudadano para confirmar reservas.'];
        }

        // ----- Sanciones pendientes -----
        if (usuario.multas.length > 0) {
            errores.push(
                'Tienes ' + usuario.multas.length + ' multa(s) pendiente(s). ' +
                'Regulariza tu situación antes de reservar nuevos recursos.'
            );
        }

        // ----- Selección -----
        const ids = dto.recursosIds ?? [];

        if (ids.length === 0) {
            errores.push('Selecciona al menos un recurso para reservar.');
        }

        if (new Set(ids).size !== ids.length) {
            errores.push('Hay recursos repetidos en tu selección.');
        }

        // ----- Límite de reservas activas -----
        const activas = usuario.librosPedidos.length;

        if (activas + ids.length > MAX_RESERVAS_ACTIVAS) {
            const restantes = Math.max(0, MAX_RESERVAS_ACTIVAS - activas);
            errores.push(
                'Puedes tener como máximo ' + MAX_RESERVAS_ACTIVAS + ' recursos reservados. ' +
                'Ya tienes ' + activas + ', así que puedes agregar ' + restantes + ' más.'
            );
        }

        // ----- Cada recurso -----
        for (const id of ids) {
            const recurso = this.catalogoService.getRecurso(id);

            if (!recurso) {
                errores.push('Uno de los recursos seleccionados ya no existe en el catálogo.');
                continue;
            }

            if (!recurso.activo) {
                errores.push('"' + recurso.titulo + '" fue dado de baja y no se puede reservar.');

            } else if (this.disponibles(recurso) <= 0) {
                errores.push('"' + recurso.titulo + '" ya no tiene ejemplares disponibles.');

            } else if (usuario.librosPedidos.includes(recurso.id)) {
                errores.push('Ya tienes una reserva de "' + recurso.titulo + '".');
            }
        }

        // ----- Fecha de retiro: entre hoy y DIAS_MAXIMOS_RETIRO días más -----
        if (!dto.fechaRetiro) {
            errores.push('Selecciona la fecha en que retirarás los recursos.');

        } else {
            const hoy = this.fechaLocal(new Date());
            const limite = this.fechaLocal(this.sumarDias(new Date(), DIAS_MAXIMOS_RETIRO));

            if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.fechaRetiro)) {
                errores.push('La fecha de retiro no es válida.');

            } else if (dto.fechaRetiro < hoy) {
                errores.push('La fecha de retiro no puede estar en el pasado.');

            } else if (dto.fechaRetiro > limite) {
                errores.push(
                    'La fecha de retiro debe ser dentro de los próximos ' +
                    DIAS_MAXIMOS_RETIRO + ' días.'
                );
            }
        }

        // ----- Condiciones de uso -----
        if (!dto.aceptaCondiciones) {
            errores.push('Debes aceptar las condiciones de préstamo para continuar.');
        }

        return errores;
    }


    // ------------------------------------------------------------------
    // Apoyo de fechas (en hora local, formato 'YYYY-MM-DD')
    // ------------------------------------------------------------------
    public fechaLocal(fecha: Date): string {
        const y = fecha.getFullYear();
        const m = String(fecha.getMonth() + 1).padStart(2, '0');
        const d = String(fecha.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }

    public sumarDias(fecha: Date, dias: number): Date {
        const copia = new Date(fecha);
        copia.setDate(copia.getDate() + dias);
        return copia;
    }
}
