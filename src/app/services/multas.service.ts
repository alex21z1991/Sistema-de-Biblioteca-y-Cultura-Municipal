import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import {
    EstadoMultaSancion,
    formatearMonto,
    IFilaMulta,
    IMultaForm,
    IMultaSancion,
    IResultadoMulta,
    MONTO_MULTA_MAXIMO,
    MOTIVO_MAXIMO,
    MOTIVO_MINIMO,
    ResolucionMulta,
    TipoMultaSancion
} from '../interfaces/imulta-sancion';
import { IUser } from '../interfaces/iuser';
import { LoginService } from './login.service';

@Injectable({ providedIn: 'root' })
export class MultasService {
    readonly misMultas$ = this.loginService.currentUser$.pipe(
        map(usuario => usuario?.role === 'usuario'
            ? usuario.multas.map(registro => ({ ...registro }))
            : [])
    );

    constructor(private loginService: LoginService) {}

    // Multas y sanciones pendientes: bloquean reservas y préstamos
    contarPendientes(usuario: IUser): number {
        return usuario.multas.filter(registro =>
            registro.estado === EstadoMultaSancion.Pendiente
        ).length;
    }

    textoPendientes(cantidad: number): string {
        return cantidad === 1
            ? '1 multa o sanción pendiente'
            : cantidad + ' multas o sanciones pendientes';
    }


    // ------------------------------------------------------------------
    // HU-A06: consulta para el administrador
    // ------------------------------------------------------------------

    // Todos los registros de todos los ciudadanos, el más reciente primero
    todas(): IFilaMulta[] {
        const filas: IFilaMulta[] = [];

        for (const ciudadano of this.loginService.getCiudadanos()) {
            for (const multa of ciudadano.multas) {
                filas.push({ usuarioId: ciudadano.id, ciudadano: ciudadano.username, multa });
            }
        }

        return filas.sort((a, b) => b.multa.id - a.multa.id);
    }

    // Texto corto del estado: "Pendiente", "Pagada", "Sanción activa"...
    etiquetaEstado(multa: IMultaSancion): string {
        if (multa.tipo === TipoMultaSancion.Sancion) {
            return multa.estado === EstadoMultaSancion.Pendiente ? 'Sanción activa' : 'Sanción levantada';
        }
        if (multa.estado === EstadoMultaSancion.Pendiente) {
            return 'Pendiente';
        }
        return multa.resolucion ?? 'Resuelta';
    }

    // Nombre de la multa o sanción para los mensajes ("multa de $5.000")
    descripcion(multa: IMultaSancion): string {
        if (multa.tipo === TipoMultaSancion.Sancion) {
            return 'sanción "' + multa.motivo + '"';
        }
        return multa.monto !== undefined ? 'multa de ' + formatearMonto(multa.monto) : 'multa';
    }


    // ------------------------------------------------------------------
    // HU-A06: registrar
    // ------------------------------------------------------------------

    // Devuelve la lista de errores (vacía = todo en orden)
    validar(datos: IMultaForm): string[] {
        const errores: string[] = [];

        // ----- Ciudadano -----
        if (datos.usuarioId === null) {
            errores.push('Selecciona un ciudadano.');
        } else if (!this.buscarCiudadano(datos.usuarioId)) {
            errores.push('El ciudadano seleccionado no existe.');
        }

        // ----- Motivo -----
        const motivo = (datos.motivo || '').trim();

        if (motivo.length === 0) {
            errores.push('Escribe el motivo.');
        } else if (motivo.length < MOTIVO_MINIMO) {
            errores.push('El motivo debe tener al menos ' + MOTIVO_MINIMO + ' caracteres.');
        } else if (motivo.length > MOTIVO_MAXIMO) {
            errores.push('El motivo no puede superar los ' + MOTIVO_MAXIMO + ' caracteres.');
        }

        // ----- Monto (solo las multas; las sanciones no llevan monto) -----
        if (datos.tipo === TipoMultaSancion.Multa) {
            const monto = datos.monto;

            if (monto === null || monto === undefined || Number.isNaN(Number(monto))) {
                errores.push('Ingresa el monto de la multa.');
            } else if (!Number.isInteger(Number(monto)) || Number(monto) <= 0) {
                errores.push('El monto debe ser un número entero mayor a 0.');
            } else if (Number(monto) > MONTO_MULTA_MAXIMO) {
                errores.push('El monto no puede superar ' + formatearMonto(MONTO_MULTA_MAXIMO) + '.');
            }
        }

        return errores;
    }

    registrar(datos: IMultaForm): Observable<IResultadoMulta> {

        // Precondición: sesión administrativa
        const sesion = this.exigirAdmin();
        if (sesion) return of(sesion);

        const errores = this.validar(datos);
        if (errores.length > 0) {
            return of({ ok: false, errores });
        }

        const ciudadano = this.buscarCiudadano(datos.usuarioId!)!;
        const esMulta = datos.tipo === TipoMultaSancion.Multa;

        const registro: IMultaSancion = {
            id: this.siguienteId(),
            tipo: datos.tipo,
            motivo: datos.motivo.trim(),
            fecha: this.hoy(),
            estado: EstadoMultaSancion.Pendiente,
            ...(esMulta ? { monto: Number(datos.monto) } : {})
        };

        ciudadano.multas.push(registro);

        return of({ ok: true, errores: [], multa: registro });
    }


    // ------------------------------------------------------------------
    // HU-A06: pagar, condonar y alternar sanción
    // ------------------------------------------------------------------

    pagar(usuarioId: number, multaId: number): Observable<IResultadoMulta> {
        return of(this.resolverMulta(usuarioId, multaId, ResolucionMulta.Pagada));
    }

    condonar(usuarioId: number, multaId: number): Observable<IResultadoMulta> {
        return of(this.resolverMulta(usuarioId, multaId, ResolucionMulta.Condonada));
    }

    // Sanción activa -> levantada, y levantada -> activa de nuevo
    alternarSancion(usuarioId: number, multaId: number): Observable<IResultadoMulta> {

        const sesion = this.exigirAdmin();
        if (sesion) return of(sesion);

        const encontrada = this.buscar(usuarioId, multaId);
        if (typeof encontrada === 'string') return of({ ok: false, errores: [encontrada] });

        const registro = encontrada;

        if (registro.tipo !== TipoMultaSancion.Sancion) {
            return of({ ok: false, errores: ['Una multa no se puede alternar: se paga o se condona.'] });
        }

        if (registro.estado === EstadoMultaSancion.Pendiente) {
            registro.estado = EstadoMultaSancion.Resuelta;
            registro.resolucion = ResolucionMulta.Levantada;
            registro.fechaResolucion = this.hoy();
        } else {
            registro.estado = EstadoMultaSancion.Pendiente;
            delete registro.resolucion;
            delete registro.fechaResolucion;
        }

        return of({ ok: true, errores: [], multa: registro });
    }

    private resolverMulta(usuarioId: number, multaId: number, resolucion: ResolucionMulta): IResultadoMulta {

        const sesion = this.exigirAdmin();
        if (sesion) return sesion;

        const encontrada = this.buscar(usuarioId, multaId);
        if (typeof encontrada === 'string') return { ok: false, errores: [encontrada] };

        const registro = encontrada;

        if (registro.tipo !== TipoMultaSancion.Multa) {
            return { ok: false, errores: ['Las sanciones no se pagan ni se condonan: usa "Levantar sanción".'] };
        }

        // Excepción: multa ya resuelta
        if (registro.estado === EstadoMultaSancion.Resuelta) {
            return {
                ok: false,
                errores: ['Esta multa ya fue resuelta' + (registro.resolucion ? ' (' + registro.resolucion + ')' : '') + '.']
            };
        }

        registro.estado = EstadoMultaSancion.Resuelta;
        registro.resolucion = resolucion;
        registro.fechaResolucion = this.hoy();

        return { ok: true, errores: [], multa: registro };
    }


    // ------------------------------------------------------------------
    // Auxiliares
    // ------------------------------------------------------------------

    private exigirAdmin(): IResultadoMulta | null {
        if (this.loginService.isAdmin()) return null;

        return {
            ok: false,
            errores: ['Inicia sesión como administrador para gestionar multas y sanciones.']
        };
    }

    private buscarCiudadano(usuarioId: number): IUser | undefined {
        return this.loginService.getCiudadanos().find(u => u.id === usuarioId);
    }

    // El registro, o el texto del error si el ciudadano o el registro no existen
    private buscar(usuarioId: number, multaId: number): IMultaSancion | string {
        const ciudadano = this.buscarCiudadano(usuarioId);
        if (!ciudadano) return 'El ciudadano no existe.';

        const registro = ciudadano.multas.find(m => m.id === multaId);
        if (!registro) return 'La multa o sanción no existe.';

        return registro;
    }

    // Identificador único entre todos los ciudadanos
    private siguienteId(): number {
        const ids = this.loginService.getCiudadanos().flatMap(c => c.multas.map(m => m.id));
        return ids.length > 0 ? Math.max(...ids) + 1 : 1;
    }

    // Fecha de hoy ('YYYY-MM-DD', hora local)
    private hoy(): string {
        const d = new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }
}
