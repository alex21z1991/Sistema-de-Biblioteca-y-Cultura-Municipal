import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import {
    EstadoReservaSala,
    IBloqueHorario,
    IReservaSala,
    IReservaSalaDto,
    IResultadoReservaSala,
    ISala
} from '../interfaces/isala';

import { LoginService } from './login.service';
import { ReservaService } from './reserva.service';

// Reglas de negocio
export const HORA_APERTURA_SALAS = 8;        // primer bloque: 08:00
export const HORA_CIERRE_SALAS = 20;         // las salas se desocupan a las 20:00
export const DURACION_MAXIMA_SALA = 3;       // horas por reserva
export const DIAS_ANTICIPACION_SALA = 14;    // se reserva desde hoy hasta 14 días más
export const MAX_RESERVAS_SALA_ACTIVAS = 2;  // reservas de sala vigentes por ciudadano
const LATENCIA_SIMULADA = 500;               // ms, para ver el estado de carga

@Injectable({ providedIn: 'root' })
export class SalaService {

    // Salas en memoria (mismo enfoque que los otros servicios)
    private salas: ISala[] = [
        { id: 1, nombre: 'Sala Gabriela Mistral', ubicacion: 'Biblioteca, piso 2', capacidad: 4, equipamiento: ['Pizarra', 'Enchufes'], activa: true },
        { id: 2, nombre: 'Sala Pablo Neruda', ubicacion: 'Biblioteca, piso 2', capacidad: 6, equipamiento: ['Pizarra', 'Pantalla', 'Enchufes'], activa: true },
        { id: 3, nombre: 'Sala grupal Atacama', ubicacion: 'Biblioteca, piso 3', capacidad: 10, equipamiento: ['Proyector', 'Pizarra', 'Enchufes'], activa: true },
        { id: 4, nombre: 'Cubículo individual 1', ubicacion: 'Sala de lectura silenciosa, piso 3', capacidad: 1, equipamiento: ['Lámpara', 'Enchufe'], activa: true },
        { id: 5, nombre: 'Cubículo individual 2', ubicacion: 'Sala de lectura silenciosa, piso 3', capacidad: 1, equipamiento: ['Lámpara', 'Enchufe'], activa: true },
        { id: 6, nombre: 'Sala Altiplano', ubicacion: 'Biblioteca, piso 1', capacidad: 8, equipamiento: ['Pizarra', 'Acceso universal'], activa: false }
    ];

    private reservas: IReservaSala[] = [];
    private ultimoId = 0;

    constructor(
        private loginService: LoginService,
        private reservaService: ReservaService   // se reutilizan sus utilidades de fecha
    ) {
        this.cargarDatosDePrueba();
    }

    // Reservas de ejemplo
    private cargarDatosDePrueba(): void {
        const hoy = new Date();
        const dia = (dias: number) => this.reservaService.fechaLocal(this.reservaService.sumarDias(hoy, dias));

        const semillas: Omit<IReservaSala, 'id' | 'codigo'>[] = [
            { usuarioId: 2, salaId: 1, nombreSala: 'Sala Gabriela Mistral', fecha: dia(1), horaInicio: '10:00', horaFin: '12:00', personas: 3, fechaSolicitud: dia(-1), estado: EstadoReservaSala.Confirmada },
            { usuarioId: 3, salaId: 2, nombreSala: 'Sala Pablo Neruda', fecha: dia(2), horaInicio: '15:00', horaFin: '17:00', personas: 4, fechaSolicitud: dia(-1), estado: EstadoReservaSala.Confirmada },
            { usuarioId: 2, salaId: 3, nombreSala: 'Sala grupal Atacama', fecha: dia(1), horaInicio: '16:00', horaFin: '19:00', personas: 8, fechaSolicitud: dia(-2), estado: EstadoReservaSala.Cancelada }
        ];

        for (const semilla of semillas) {
            this.reservas.push({ ...semilla, id: ++this.ultimoId, codigo: this.generarCodigo(this.ultimoId) });
        }
    }

    private generarCodigo(id: number): string {
        return 'SAL-' + String(id).padStart(4, '0');
    }


    // ------------------------------------------------------------------
    // Consultas
    // ------------------------------------------------------------------

    // Salas que se pueden reservar
    public getSalas(): Observable<ISala[]> {
        const activas = this.salas.filter(s => s.activa).map(s => ({ ...s, equipamiento: [...s.equipamiento] }));
        return of(activas).pipe(delay(LATENCIA_SIMULADA));
    }

    public getSala(salaId: number): ISala | undefined {
        return this.salas.find(s => s.id === salaId);
    }

    // Capacidad de la sala más grande disponible
    public getCapacidadMaxima(): number {
        return Math.max(0, ...this.salas.filter(s => s.activa).map(s => s.capacidad));
    }

    // Bloques de una hora de la sala para un día
    public getBloques(salaId: number, fecha: string): IBloqueHorario[] {
        const bloques: IBloqueHorario[] = [];

        for (let h = HORA_APERTURA_SALAS; h < HORA_CIERRE_SALAS; h++) {
            const inicio = this.hora(h);
            const fin = this.hora(h + 1);
            bloques.push({
                hora: inicio,
                disponible: !this.yaPaso(fecha, inicio) && !this.salaOcupada(salaId, fecha, inicio, fin)
            });
        }

        return bloques;
    }

    // Horas de inicio en que la sala queda libre durante toda la duración pedida
    public getHorasInicioDisponibles(salaId: number, fecha: string, duracion: number): string[] {
        if (!fecha || !duracion) {
            return [];
        }

        const bloques = this.getBloques(salaId, fecha);
        const horas: string[] = [];

        for (let i = 0; i + duracion <= bloques.length; i++) {
            if (bloques.slice(i, i + duracion).every(b => b.disponible)) {
                horas.push(bloques[i].hora);
            }
        }

        return horas;
    }

    // Próximas reservas de sala del ciudadano en sesión
    public getMisReservasSala(): Observable<IReservaSala[]> {
        const usuario = this.loginService.getUsuarioActual();

        if (!usuario) {
            return of([]);
        }

        const propias = this.reservasVigentes(usuario.id)
            .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio))
            .map(r => ({ ...r }));

        return of(propias);
    }


    // ------------------------------------------------------------------
    // Reservar
    // ------------------------------------------------------------------

    public reservarSala(dto: IReservaSalaDto): Observable<IResultadoReservaSala> {
        const errores = this.validar(dto);

        if (errores.length > 0) {
            return of({ ok: false, errores }).pipe(delay(LATENCIA_SIMULADA));
        }

        const usuario = this.loginService.getUsuarioActual()!;
        const sala = this.getSala(dto.salaId!)!;

        const reserva: IReservaSala = {
            id: ++this.ultimoId,
            codigo: this.generarCodigo(this.ultimoId),
            usuarioId: usuario.id,
            salaId: sala.id,
            nombreSala: sala.nombre,
            fecha: dto.fecha,
            horaInicio: dto.horaInicio,
            horaFin: this.calcularHoraFin(dto.horaInicio, dto.duracion),
            personas: Number(dto.personas),
            fechaSolicitud: this.reservaService.fechaLocal(new Date()),
            estado: EstadoReservaSala.Confirmada
        };

        this.reservas.push(reserva);
        usuario.salasPedidas.push(sala.id);

        return of({ ok: true, errores: [], reserva: { ...reserva } }).pipe(delay(LATENCIA_SIMULADA));
    }


    // ------------------------------------------------------------------
    // Validaciones
    // ------------------------------------------------------------------

    public validar(dto: IReservaSalaDto): string[] {
        const errores: string[] = [];
        const usuario = this.loginService.getUsuarioActual();

        // ----- Precondición: sesión de ciudadano -----
        if (!usuario || usuario.role !== 'usuario') {
            return ['Inicia sesión como ciudadano para reservar una sala.'];
        }

        // ----- Sanciones pendientes -----
        if (usuario.multas.length > 0) {
            errores.push(
                'Tienes ' + usuario.multas.length + ' multa(s) pendiente(s). ' +
                'Regulariza tu situación antes de reservar una sala.'
            );
        }

        // ----- Límite de reservas vigentes -----
        if (this.reservasVigentes(usuario.id).length >= MAX_RESERVAS_SALA_ACTIVAS) {
            errores.push(
                'Puedes tener como máximo ' + MAX_RESERVAS_SALA_ACTIVAS + ' reservas de sala vigentes. ' +
                'Espera a usar una de ellas para reservar otra.'
            );
        }

        // ----- Fecha: entre hoy y DIAS_ANTICIPACION_SALA días más -----
        const hoy = this.reservaService.fechaLocal(new Date());
        const limite = this.reservaService.fechaLocal(this.reservaService.sumarDias(new Date(), DIAS_ANTICIPACION_SALA));
        let fechaValida = false;

        if (!dto.fecha) {
            errores.push('Selecciona la fecha de la reserva.');
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.fecha)) {
            errores.push('La fecha de la reserva no es válida.');
        } else if (dto.fecha < hoy) {
            errores.push('La fecha de la reserva no puede estar en el pasado.');
        } else if (dto.fecha > limite) {
            errores.push('Solo puedes reservar dentro de los próximos ' + DIAS_ANTICIPACION_SALA + ' días.');
        } else {
            fechaValida = true;
        }

        // ----- Personas -----
        const personas = Number(dto.personas);
        if (dto.personas === null || !Number.isInteger(personas) || personas < 1) {
            errores.push('Indica cuántas personas usarán la sala (al menos 1).');
        }

        // ----- Sala -----
        const sala = dto.salaId !== null ? this.getSala(dto.salaId) : undefined;
        if (!sala) {
            errores.push('Selecciona una sala de estudio.');
        } else if (!sala.activa) {
            errores.push('"' + sala.nombre + '" está en mantención y no se puede reservar.');
        } else if (personas > sala.capacidad) {
            errores.push('"' + sala.nombre + '" admite como máximo ' + sala.capacidad + ' persona(s).');
        }

        // ----- Horario -----
        const duracion = Number(dto.duracion);
        const horaValida = /^\d{2}:00$/.test(dto.horaInicio ?? '');

        if (!Number.isInteger(duracion) || duracion < 1 || duracion > DURACION_MAXIMA_SALA) {
            errores.push('La duración debe ser de 1 a ' + DURACION_MAXIMA_SALA + ' horas.');
        } else if (!horaValida) {
            errores.push('Selecciona la hora de inicio.');
        } else {
            const inicio = Number(dto.horaInicio.slice(0, 2));
            const horaFin = this.calcularHoraFin(dto.horaInicio, duracion);

            if (inicio < HORA_APERTURA_SALAS || inicio + duracion > HORA_CIERRE_SALAS) {
                errores.push(
                    'Las salas se usan entre las ' + this.hora(HORA_APERTURA_SALAS) +
                    ' y las ' + this.hora(HORA_CIERRE_SALAS) + ' horas.'
                );
            } else if (fechaValida && this.yaPaso(dto.fecha, dto.horaInicio)) {
                errores.push('La hora de inicio ya pasó. Elige un horario posterior.');
            } else if (fechaValida && sala && this.salaOcupada(sala.id, dto.fecha, dto.horaInicio, horaFin)) {
                errores.push('"' + sala.nombre + '" ya está reservada en ese horario. Elige otra hora u otra sala.');
            } else if (fechaValida && this.usuarioOcupado(usuario.id, dto.fecha, dto.horaInicio, horaFin)) {
                errores.push('Ya tienes otra sala reservada que se cruza con ese horario.');
            }
        }

        return errores;
    }


    // ------------------------------------------------------------------
    // Apoyo
    // ------------------------------------------------------------------

    public calcularHoraFin(horaInicio: string, duracion: number): string {
        return this.hora(Number(horaInicio.slice(0, 2)) + Number(duracion));
    }

    // 9 -> '09:00'
    private hora(h: number): string {
        return String(h).padStart(2, '0') + ':00';
    }

    // Reservas confirmadas que todavía no terminan
    private reservasVigentes(usuarioId: number): IReservaSala[] {
        return this.reservas.filter(r =>
            r.usuarioId === usuarioId &&
            r.estado === EstadoReservaSala.Confirmada &&
            !this.yaPaso(r.fecha, r.horaFin)
        );
    }

    // Dos rangos [inicio, fin) se cruzan (las horas 'HH:mm' se comparan como texto)
    private seCruzan(r: IReservaSala, fecha: string, inicio: string, fin: string): boolean {
        return r.estado === EstadoReservaSala.Confirmada &&
            r.fecha === fecha &&
            r.horaInicio < fin &&
            inicio < r.horaFin;
    }

    private salaOcupada(salaId: number, fecha: string, inicio: string, fin: string): boolean {
        return this.reservas.some(r => r.salaId === salaId && this.seCruzan(r, fecha, inicio, fin));
    }

    private usuarioOcupado(usuarioId: number, fecha: string, inicio: string, fin: string): boolean {
        return this.reservas.some(r => r.usuarioId === usuarioId && this.seCruzan(r, fecha, inicio, fin));
    }

    // El momento fecha + hora ya pasó
    private yaPaso(fecha: string, hora: string): boolean {
        const [y, m, d] = fecha.split('-').map(Number);
        const [hh, mm] = hora.split(':').map(Number);
        return new Date(y, m - 1, d, hh, mm).getTime() <= Date.now();
    }
}
