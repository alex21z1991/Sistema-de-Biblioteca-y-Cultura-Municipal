import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';

import { CartResult } from '../interfaces/cart';
import { IRecurso } from '../interfaces/irecurso';
import {
    EstadoReserva,
    IConfirmarReservaDto,
    IReserva,
    IResultadoReserva
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

    constructor(
        private catalogoService: CatalogoService,
        private loginService: LoginService
    ) {
        this.cargarDatosDePrueba();
    }

    // HU-C06: reservas de ejemplo para el ciudadano "alex"
    private cargarDatosDePrueba(): void {
        const hoy = new Date();
        const dia = (dias: number) => this.fechaLocal(this.sumarDias(hoy, dias));

        const reservas: Omit<IReserva, 'id' | 'codigo'>[] = [
            { usuarioId: 3, recursoId: 2, tituloRecurso: 'Libro1', fechaSolicitud: dia(-10), fechaRetiro: dia(-8), estado: EstadoReserva.Retirada },
            { usuarioId: 3, recursoId: 7, tituloRecurso: 'Atlas de Chile', fechaSolicitud: dia(-6), fechaRetiro: dia(-4), estado: EstadoReserva.Cancelada, fechaCancelacion: dia(-5) },
            { usuarioId: 3, recursoId: 4, tituloRecurso: 'Subterra', fechaSolicitud: dia(-2), fechaRetiro: dia(1), estado: EstadoReserva.PendienteRetiro },
            { usuarioId: 3, recursoId: 1, tituloRecurso: 'Cien años de soledad', fechaSolicitud: dia(-1), fechaRetiro: dia(3), estado: EstadoReserva.PendienteRetiro }
        ];

        for (const semilla of reservas) {
            this.reservas.push({ ...semilla, id: ++this.ultimoId, codigo: this.generarCodigo(this.ultimoId) });
        }
    }

    private generarCodigo(id: number): string {
        return 'RES-' + String(id).padStart(4, '0');
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
                codigo: this.generarCodigo(this.ultimoId),
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

        return of({ ok: true, errores: [], reservas: nuevas }).pipe(delay(LATENCIA_SIMULADA));
    }

    // ------------------------------------------------------------------
    // HU-C06: consultar y cancelar reservas
    // ------------------------------------------------------------------

    // Reservas del ciudadano en sesión, las más recientes primero.
    // Se entregan copias para que la vista no modifique los datos del servicio.
    public getMisReservas(): Observable<IReserva[]> {
        const usuario = this.loginService.getUsuarioActual();

        if (!usuario) {
            return of([]);
        }

        const propias = this.reservas
            .filter(r => r.usuarioId === usuario.id)
            .sort((a, b) => b.fechaSolicitud.localeCompare(a.fechaSolicitud) || b.id - a.id)
            .map(r => ({ ...r }));

        return of(propias);
    }

    // Solo se cancela lo que todavía no se retira
    public puedeCancelar(reserva: IReserva): boolean {
        return reserva.estado === EstadoReserva.PendienteRetiro;
    }

    public cancelarReserva(reservaId: number): Observable<IResultadoReserva> {
        const usuario = this.loginService.getUsuarioActual();

        if (!usuario || usuario.role !== 'usuario') {
            return of({ ok: false, errores: ['Inicia sesión como ciudadano para cancelar reservas.'] });
        }

        // Una reserva ajena se trata igual que una inexistente
        const reserva = this.reservas.find(r => r.id === reservaId && r.usuarioId === usuario.id);

        if (!reserva) {
            return of({ ok: false, errores: ['La reserva no existe o no pertenece a tu cuenta.'] });
        }

        if (reserva.estado === EstadoReserva.Retirada) {
            return of({ ok: false, errores: ['No puedes cancelar "' + reserva.tituloRecurso + '" porque ya lo retiraste.'] });
        }

        if (reserva.estado === EstadoReserva.Cancelada) {
            return of({ ok: false, errores: ['La reserva ' + reserva.codigo + ' ya estaba cancelada.'] });
        }

        reserva.estado = EstadoReserva.Cancelada;
        reserva.fechaCancelacion = this.fechaLocal(new Date());

        // Liberar el ejemplar en el catálogo y en el registro del ciudadano
        const recurso = this.catalogoService.getRecurso(reserva.recursoId);
        if (recurso) {
            recurso.ejemplaresComprometidos = Math.max(0, recurso.ejemplaresComprometidos - 1);
        }

        const indice = usuario.librosPedidos.indexOf(reserva.recursoId);
        if (indice >= 0) {
            usuario.librosPedidos.splice(indice, 1);
        }

        return of({ ok: true, errores: [], reservas: [{ ...reserva }] }).pipe(delay(LATENCIA_SIMULADA));
    }


    // ------------------------------------------------------------------
    // Validaciones
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
    // Apoyo de fechas
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
