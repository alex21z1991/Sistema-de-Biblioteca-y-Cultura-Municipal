// HU-A12: Consultar panel administrativo [Administrador]
// Reúne en un solo resumen los datos de catálogo, préstamos, reservas,
// multas, actividades y salas. No guarda datos propios: solo consulta.

import { Injectable } from '@angular/core';
import { forkJoin, Observable, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';

import { EstadoActividad, IActividad } from '../interfaces/iactividad';
import { EstadoMultaSancion } from '../interfaces/imulta-sancion';
import {
    IAlertaOperativa,
    IMovimiento,
    IResumenActividades,
    IResumenMovimientos,
    IResumenMultas,
    IResumenPanel,
    IResumenRecursos,
    IResumenSalas,
    TipoMovimiento,
    TonoIndicador
} from '../interfaces/ipanel-admin';
import { EstadoPrestamo, IPrestamo } from '../interfaces/iprestamo';
import { IRecurso } from '../interfaces/irecurso';
import { EstadoReserva, IReserva } from '../interfaces/ireserva';
import { EstadoReservaSala, IReservaSala, ISala } from '../interfaces/isala';
import { IUser } from '../interfaces/iuser';

import { ActividadService } from './actividad.service';
import { CatalogoService } from './catalogo.service';
import { LoginService } from './login.service';
import { PrestamoService } from './prestamo.service';
import { ReservaService } from './reserva.service';
import { SalaService } from './sala.service';

const MOVIMIENTOS_RECIENTES = 6;
const ACTIVIDADES_SIGUIENTES = 4;
const RESERVAS_SALA_PROXIMAS = 5;
const LATENCIA_SIMULADA = 400;   // ms, para que se vea el estado de carga

// Datos crudos que se piden a los demás servicios
interface IFuentesPanel {
    recursos: IRecurso[];
    prestamos: IPrestamo[];
    reservas: IReserva[];
    actividades: IActividad[];
    salas: ISala[];
    reservasSala: IReservaSala[];
}

@Injectable({ providedIn: 'root' })
export class PanelAdminService {

    constructor(
        private loginService: LoginService,
        private catalogoService: CatalogoService,
        private prestamoService: PrestamoService,
        private reservaService: ReservaService,
        private actividadService: ActividadService,
        private salaService: SalaService
    ) {}

    public getResumen(): Observable<IResumenPanel> {
        if (!this.loginService.isAdmin()) {
            return throwError(() => new Error('Solo un administrador puede consultar el panel.'));
        }

        return forkJoin({
            recursos: this.catalogoService.getRecursos(),
            prestamos: this.prestamoService.getPrestamos(),
            reservas: this.reservaService.getTodasLasReservas(),
            actividades: this.actividadService.getActividades(),
            salas: this.salaService.getTodasLasSalas(),
            reservasSala: this.salaService.getTodasLasReservasSala()
        }).pipe(
            delay(LATENCIA_SIMULADA),
            map(fuentes => this.construirResumen(fuentes, this.prestamoService.hoy(), new Date()))
        );
    }

    // Público para poder probarlo con datos fijos
    public construirResumen(fuentes: IFuentesPanel, hoy: string, ahora: Date): IResumenPanel {
        const usuarios = this.loginService.getUsers();
        const nombre = (id: number) => usuarios.find(u => u.id === id)?.username ?? 'Usuario #' + id;

        const recursos = this.resumirRecursos(fuentes.recursos);
        const movimientos = this.resumirMovimientos(fuentes.prestamos, fuentes.reservas, hoy, nombre);
        const multas = this.resumirMultas(usuarios.filter(u => u.role === 'usuario'));
        const actividades = this.resumirActividades(fuentes.actividades, ahora);
        const salas = this.resumirSalas(fuentes.salas, fuentes.reservasSala, hoy, nombre);

        return {
            generadoEn: ahora,
            recursos,
            movimientos,
            multas,
            actividades,
            salas,
            alertas: this.armarAlertas(recursos, movimientos, multas, actividades, salas)
        };
    }


    // ------------------------------------------------------------------
    // Secciones del resumen
    // ------------------------------------------------------------------

    private resumirRecursos(recursos: IRecurso[]): IResumenRecursos {
        const activos = recursos.filter(r => r.activo);
        const libres = (r: IRecurso) => Math.max(0, r.ejemplares - r.ejemplaresComprometidos);

        return {
            total: recursos.length,
            activos: activos.length,
            dadosDeBaja: recursos.length - activos.length,
            ejemplares: activos.reduce((suma, r) => suma + r.ejemplares, 0),
            ejemplaresDisponibles: activos.reduce((suma, r) => suma + libres(r), 0),
            sinStock: activos.filter(r => libres(r) === 0).length
        };
    }

    private resumirMovimientos(
        prestamos: IPrestamo[],
        reservas: IReserva[],
        hoy: string,
        nombre: (id: number) => string
    ): IResumenMovimientos {
        const activos = prestamos.filter(p => p.estado === EstadoPrestamo.Prestado);
        const devueltos = prestamos.filter(p => p.estado === EstadoPrestamo.Devuelto);
        const porRetirar = reservas.filter(r => r.estado === EstadoReserva.PendienteRetiro);

        const linea: IMovimiento[] = [];

        for (const p of prestamos) {
            linea.push({
                tipo: TipoMovimiento.Prestamo,
                fecha: p.fechaPrestamo,
                recurso: p.recursoTitulo,
                usuario: p.usuarioNombre,
                detalle: p.reservaCodigo ? 'Retiro de ' + p.reservaCodigo : 'Préstamo directo'
            });

            if (p.estado === EstadoPrestamo.Devuelto && p.fechaDevolucionReal) {
                linea.push({
                    tipo: TipoMovimiento.Devolucion,
                    fecha: p.fechaDevolucionReal,
                    recurso: p.recursoTitulo,
                    usuario: p.usuarioNombre,
                    detalle: p.fechaDevolucionReal > p.fechaDevolucion ? 'Devuelto con atraso' : 'Devuelto a tiempo'
                });
            }
        }

        for (const r of reservas) {
            linea.push({
                tipo: TipoMovimiento.Reserva,
                fecha: r.fechaSolicitud,
                recurso: r.tituloRecurso,
                usuario: nombre(r.usuarioId),
                detalle: r.codigo + ' · ' + r.estado
            });
        }

        return {
            prestamosActivos: activos.length,
            prestamosVencidos: activos.filter(p => p.fechaDevolucion < hoy).length,
            devoluciones: devueltos.length,
            reservasPorRetirar: porRetirar.length,
            retirosHoy: porRetirar.filter(r => r.fechaRetiro === hoy).length,
            recientes: linea
                .sort((a, b) => b.fecha.localeCompare(a.fecha))
                .slice(0, MOVIMIENTOS_RECIENTES)
        };
    }

    private resumirMultas(ciudadanos: IUser[]): IResumenMultas {
        let pendientes = 0;
        let resueltas = 0;
        const conPendientes: string[] = [];

        for (const c of ciudadanos) {
            const propias = c.multas.filter(m => m.estado === EstadoMultaSancion.Pendiente).length;
            pendientes += propias;
            resueltas += c.multas.length - propias;
            if (propias > 0) {
                conPendientes.push(c.username);
            }
        }

        return {
            pendientes,
            resueltas,
            ciudadanosConPendientes: conPendientes,
            cuentasInhabilitadas: ciudadanos.filter(c => c.habilitado === false).length
        };
    }

    private resumirActividades(actividades: IActividad[], ahora: Date): IResumenActividades {
        const futuras = actividades.filter(a => new Date(a.fecha).getTime() > ahora.getTime());
        const proximas = futuras
            .filter(a => a.estado === EstadoActividad.Activa)
            .sort((a, b) => a.fecha.localeCompare(b.fecha));

        const inscritos = proximas.reduce((suma, a) => suma + a.inscritos.length, 0);
        const capacidad = proximas.reduce((suma, a) => suma + a.capacidad, 0);

        return {
            proximas: proximas.length,
            canceladas: futuras.filter(a => a.estado === EstadoActividad.Cancelada).length,
            inscritos,
            ocupacion: capacidad > 0 ? Math.round((inscritos / capacidad) * 100) : 0,
            llenas: proximas.filter(a => a.inscritos.length >= a.capacidad).length,
            siguientes: proximas.slice(0, ACTIVIDADES_SIGUIENTES).map(a => ({
                id: a.id,
                titulo: a.titulo,
                fecha: a.fecha,
                lugar: a.lugar,
                inscritos: a.inscritos.length,
                capacidad: a.capacidad
            }))
        };
    }

    private resumirSalas(
        salas: ISala[],
        reservas: IReservaSala[],
        hoy: string,
        nombre: (id: number) => string
    ): IResumenSalas {
        const vigentes = reservas
            .filter(r => r.estado === EstadoReservaSala.Confirmada && r.fecha >= hoy)
            .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio));

        return {
            activas: salas.filter(s => s.activa).length,
            enMantencion: salas.filter(s => !s.activa).length,
            reservasHoy: vigentes.filter(r => r.fecha === hoy).length,
            reservasProximas: vigentes.length,
            proximas: vigentes.slice(0, RESERVAS_SALA_PROXIMAS).map(r => ({
                codigo: r.codigo,
                sala: r.nombreSala,
                fecha: r.fecha,
                horario: r.horaInicio + ' – ' + r.horaFin,
                personas: r.personas,
                usuario: nombre(r.usuarioId)
            }))
        };
    }


    // ------------------------------------------------------------------
    // Alertas: lo que el administrador debería atender primero
    // ------------------------------------------------------------------

    private armarAlertas(
        recursos: IResumenRecursos,
        movimientos: IResumenMovimientos,
        multas: IResumenMultas,
        actividades: IResumenActividades,
        salas: IResumenSalas
    ): IAlertaOperativa[] {
        const alertas: IAlertaOperativa[] = [];
        const plural = (n: number, uno: string, varios: string) => n + ' ' + (n === 1 ? uno : varios);

        if (movimientos.prestamosVencidos > 0) {
            alertas.push({
                tono: TonoIndicador.Peligro,
                mensaje: plural(movimientos.prestamosVencidos, 'préstamo vencido', 'préstamos vencidos') + ' sin devolver.',
                enlace: '/admin-devoluciones',
                textoEnlace: 'Ir a devoluciones'
            });
        }

        if (movimientos.retirosHoy > 0) {
            alertas.push({
                tono: TonoIndicador.Aviso,
                mensaje: plural(movimientos.retirosHoy, 'reserva se retira', 'reservas se retiran') + ' hoy en biblioteca.',
                enlace: '/admin-prestamos',
                textoEnlace: 'Ir a préstamos'
            });
        }

        if (multas.pendientes > 0) {
            alertas.push({
                tono: TonoIndicador.Aviso,
                mensaje: plural(multas.pendientes, 'multa o sanción pendiente', 'multas o sanciones pendientes') +
                    ' (' + multas.ciudadanosConPendientes.join(', ') + ').',
                enlace: '/admin-multas',
                textoEnlace: 'Ir a multas'
            });
        }

        if (recursos.sinStock > 0) {
            alertas.push({
                tono: TonoIndicador.Normal,
                mensaje: plural(recursos.sinStock, 'recurso activo no tiene', 'recursos activos no tienen') + ' ejemplares disponibles.',
                enlace: '/admin-catalogo',
                textoEnlace: 'Ir al catálogo'
            });
        }

        if (actividades.llenas > 0) {
            alertas.push({
                tono: TonoIndicador.Normal,
                mensaje: plural(actividades.llenas, 'actividad próxima está', 'actividades próximas están') + ' sin cupos.',
                enlace: '/admin-panel',
                textoEnlace: 'Ir a la cartelera'
            });
        }

        if (salas.enMantencion > 0) {
            alertas.push({
                tono: TonoIndicador.Normal,
                mensaje: plural(salas.enMantencion, 'sala está', 'salas están') + ' en mantención.',
                enlace: '/admin-resumen',
                fragmento: 'salas',
                textoEnlace: 'Ver salas'
            });
        }

        return alertas;
    }
}
