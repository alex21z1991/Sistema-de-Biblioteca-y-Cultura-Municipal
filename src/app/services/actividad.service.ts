import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import {
    IActividad,
    IActividadForm,
    IResultadoActividad,
    TipoActividad, 
    EstadoActividad,
} from '../interfaces/iactividad';

import { LoginService } from './login.service';
import { aforoDeLugar, DURACION_MINIMA, DURACION_MAXIMA, formatearDuracion, fechaFin, horaFin } from '../data/listas';

@Injectable({ providedIn: 'root' })
export class ActividadService {

    // Cartelera en memoria (mismo enfoque que LoginService)
    private actividades: IActividad[] = [
        {
            id: 1,
            titulo: 'Taller de encuadernación artesanal',
            tipo: TipoActividad.Taller,
            lugar: 'Sala de talleres, piso 2',
            descripcion: 'Cuatro sesiones para aprender costura copta y tapa dura.',
            fecha: '2026-10-15T18:30',
            duracion: 120,
            capacidad: 20,
            inscritos: [2],
            estado: EstadoActividad.Activa,

        },
        {
            id: 2,
            titulo: 'Cuentacuentos infantil',
            tipo: TipoActividad.Evento,
            lugar: 'Sala infantil',
            descripcion: 'Lectura en voz alta para niños de 4 a 8 años.',
            fecha: '2026-11-03T11:00',
            duracion: 60,
            capacidad: 40,
            inscritos: [2],
            estado: EstadoActividad.Activa,
        },
        {
            id: 3,
            titulo: 'Club de lectura: narrativa nortina',
            tipo: TipoActividad.Evento,
            lugar: 'Auditorio municipal',
            descripcion: 'Conversación mensual sobre autores de la región.',
            fecha: '2026-12-05T19:00',
            duracion: 90,
            capacidad: 30,
            inscritos: [],
            estado: EstadoActividad.Activa,
        },
        {
            id: 4,
            titulo: 'Taller de programación en Python',
            tipo: TipoActividad.Taller,
            lugar: 'Laboratorio de computación',
            descripcion: 'Introducción básica a algoritmos y lógica de programación para principiantes.',
            fecha: '2026-10-20T17:00',
            duracion: 120,
            capacidad: 15,
            inscritos: [],
            estado: EstadoActividad.Activa,
        },
        {
            id: 5,
            titulo: 'Concierto de la Orquesta Juvenil',
            tipo: TipoActividad.Evento,
            lugar: 'Teatro Municipal',
            descripcion: 'Presentación musical cultural',
            fecha: '2026-11-12T19:30',
            duracion: 120,
            capacidad: 100,
            inscritos: [],
            estado: EstadoActividad.Activa,
        },
        {
            id: 6,
            titulo: 'Taller de fotografía urbana',
            tipo: TipoActividad.Taller,
            lugar: 'Patio central de la biblioteca',
            descripcion: 'Aprende encuadre, manejo de luz e historia visual utilizando tu teléfono o cámara.',
            fecha: '2026-11-18T16:00',
            duracion: 120,
            capacidad: 12,
            inscritos: [],
            estado: EstadoActividad.Activa
        },
        {
            id: 7,
            titulo: 'Feria del libro usado y trueque',
            tipo: TipoActividad.Evento,
            lugar: 'Plaza de las Artes',
            descripcion: 'Espacio comunitario para intercambiar libros, revistas y cómics en buen estado.',
            fecha: '2026-12-01T10:00',
            duracion: 240,
            capacidad: 50,
            inscritos: [],
            estado: EstadoActividad.Activa
        },
        {
            id: 8,
            titulo: 'Taller de aprendizaje de matemática 1 a 1',
            tipo: TipoActividad.Taller,
            lugar: 'Sala de talleres, piso 2',
            descripcion: 'Aprende matemática básica con un tutor en sesiones individuales de 1 hora.',
            fecha: '2026-12-10T09:30',
            duracion: 150,
            capacidad: 1,
            inscritos: [],
            estado: EstadoActividad.Activa
        }
    ];

    private ultimoId: number = 8;

    constructor(private loginService: LoginService) {}


    // ------------------------------------------------------------------
    // Consultas
    // ------------------------------------------------------------------

    // Cartelera ordenada por fecha
    public getActividades(): Observable<IActividad[]> {

        const ordenadas = [...this.actividades].sort(
            (a, b) => a.fecha.localeCompare(b.fecha)
        );

        return of(ordenadas);
    }

    public getActividad(id: number): IActividad | undefined {
        return this.actividades.find(actividad => actividad.id === id);
    }


    // ------------------------------------------------------------------
    // Crear
    // ------------------------------------------------------------------

    public crearActividad(datos: IActividadForm): Observable<IResultadoActividad> {

        // Precondición: sesión administrativa
        if (!this.loginService.isAdmin()) {
            return of({
                ok: false,
                errores: ['Inicia sesión como administrador para publicar actividades.']
            });
        }

        const errores = this.validar(datos, null);

        if (errores.length > 0) {
            return of({ ok: false, errores: errores });
        }

        const nueva: IActividad = {
            id: ++this.ultimoId,
            titulo: datos.titulo.trim(),
            tipo: datos.tipo,
            lugar: datos.lugar.trim(),
            descripcion: datos.descripcion.trim(),
            fecha: datos.fecha,
            duracion: Number(datos.duracion),
            capacidad: Number(datos.capacidad),
            inscritos: [],
            estado: EstadoActividad.Activa
        };

        this.actividades.push(nueva);

        return of({ ok: true, errores: [], actividad: nueva });
    }


    // ------------------------------------------------------------------
    // Editar
    // ------------------------------------------------------------------

    public actualizarActividad(
        id: number,
        datos: IActividadForm
    ): Observable<IResultadoActividad> {

        // Precondición: sesión administrativa
        if (!this.loginService.isAdmin()) {
            return of({
                ok: false,
                errores: ['Inicia sesión como administrador para editar actividades.']
            });
        }

        const actual = this.getActividad(id);

        if (!actual) {
            return of({
                ok: false,
                errores: ['La actividad ya no existe en la cartelera.']
            });
        }

        const errores = this.validar(datos, actual);

        if (errores.length > 0) {
            return of({ ok: false, errores: errores });
        }

        actual.titulo = datos.titulo.trim();
        actual.tipo = datos.tipo;
        actual.lugar = datos.lugar.trim();
        actual.descripcion = datos.descripcion.trim();
        actual.fecha = datos.fecha;
        actual.duracion = Number(datos.duracion);
        actual.capacidad = Number(datos.capacidad);

        return of({ ok: true, errores: [], actividad: actual });
    }


    // ------------------------------------------------------------------
    // HU-A08: cancelar o reactivar sin alterar las inscripciones
    // ------------------------------------------------------------------
    public alternarEstado(id: number): Observable<IResultadoActividad> {
        if (!this.loginService.isAdmin()) {
            return of({
                ok: false,
                errores: ['Inicia sesión como administrador para cambiar el estado.']
            });
        }

        const actividad = this.getActividad(id);

        if (!actividad) {
            return of({ ok: false, errores: ['La actividad no existe.'] });
        }

        actividad.estado = actividad.estado === EstadoActividad.Activa ? EstadoActividad.Cancelada : EstadoActividad.Activa;

        return of({ ok: true, errores: [], actividad });
    }


    // ------------------------------------------------------------------
    // Validaciones (excepciones de la HU)
    // ------------------------------------------------------------------
    // actual = null  -> estamos creando
    // actual != null -> estamos editando esa actividad
    public validar(datos: IActividadForm, actual: IActividad | null): string[] {

        const errores: string[] = [];

        // ----- Título -----
        const titulo = (datos.titulo || '').trim();

        if (titulo.length === 0) {
            errores.push('Escribe un título para la actividad.');

        } else if (titulo.length < 5) {
            errores.push('El título necesita al menos 5 caracteres.');
        }

        // ----- Lugar -----
        if ((datos.lugar || '').trim().length === 0) {
            errores.push('Indica el lugar donde se realizará la actividad.');
        }

        // ----- Fecha: debe ser futura -----
        if (!datos.fecha) {
            errores.push('Selecciona la fecha y hora de la actividad.');

        } else {

            const fechaActividad = new Date(datos.fecha);
            const ahora = new Date();

            if (isNaN(fechaActividad.getTime())) {
                errores.push('La fecha ingresada no es válida.');

            } else if (fechaActividad.getTime() <= ahora.getTime()) {
                errores.push(
                    'La fecha debe ser futura: no se puede programar una actividad en el pasado.'
                );
            }
        }

        // ----- Duración -----
        const duracion = Number(datos.duracion);

        if (datos.duracion === null || datos.duracion === undefined || isNaN(duracion)) {
            errores.push('Indica cuánto va a durar la actividad.');

        } else if (!Number.isInteger(duracion)) {
            errores.push('La duración debe ser un número entero de minutos.');

        } else if (duracion < DURACION_MINIMA || duracion > DURACION_MAXIMA) {
            errores.push(
                'La duración debe estar entre ' + formatearDuracion(DURACION_MINIMA) +
                ' y ' + formatearDuracion(DURACION_MAXIMA) + '.'
            );
        }

        // ----- Capacidad -----
        const capacidad = Number(datos.capacidad);

        if (datos.capacidad === null || datos.capacidad === undefined || isNaN(capacidad)) {
            errores.push('Ingresa la capacidad de la actividad.');

        } else if (!Number.isInteger(capacidad)) {
            errores.push('La capacidad debe ser un número entero.');

        } else if (capacidad < 1) {
            errores.push('La capacidad debe ser de al menos 1 cupo.');


        } else if (aforoDeLugar(datos.lugar) !== undefined && capacidad > aforoDeLugar(datos.lugar)!) {
            // Excepción: no superar el cupo del lugar
            errores.push(
                'La capacidad no puede superar el cupo del lugar (' +
                aforoDeLugar(datos.lugar) + ' personas en "' + datos.lugar + '").'
            );

        } else if (actual && capacidad < actual.inscritos.length) {
            // Excepción: no reducir capacidad bajo las inscripciones existentes
            errores.push(
                'No puedes dejar la capacidad en ' + capacidad +
                ': la actividad ya tiene ' + actual.inscritos.length + ' inscripción(es) registrada(s). ' +
                'El mínimo permitido es ' + actual.inscritos.length + '.'
            );
        }

        // ----- Duplicados (mismo título, mismo día y hora) -----
        const duplicada = this.actividades.find(
            a =>
                a.titulo.trim().toLowerCase() === titulo.toLowerCase() &&
                a.fecha === datos.fecha &&
                (!actual || a.id !== actual.id)
        );

        if (titulo.length > 0 && duplicada) {
            errores.push('Ya existe una actividad con ese título en la misma fecha y hora.');
        }

        // ----- Choque de horario en el mismo lugar -----
        const inicioNuevo = new Date(datos.fecha).getTime();
        const finNuevo = fechaFin(datos.fecha, duracion)?.getTime();

        if (datos.lugar && !isNaN(inicioNuevo) && finNuevo !== undefined && !isNaN(finNuevo)) {

            const choque = this.actividades.find(a => {
                if (actual && a.id === actual.id) return false;
                if (a.estado !== EstadoActividad.Activa) return false;
                if (a.lugar !== datos.lugar) return false;

                const inicio = new Date(a.fecha).getTime();
                const fin = fechaFin(a.fecha, a.duracion)?.getTime() ?? inicio;

                return inicioNuevo < fin && finNuevo > inicio;
            });

            if (choque) {
                errores.push(
                    'El lugar "' + datos.lugar + '" ya está ocupado por "' + choque.titulo +
                    '" de ' + choque.fecha.slice(11, 16) + ' a ' + horaFin(choque.fecha, choque.duracion) +
                    ' ese día. Elige otro horario o lugar.'
                );
            }
        }

        return errores;
    }


    // ------------------------------------------------------------------
    // Apoyo para pruebas / demo: simular una inscripción
    // ------------------------------------------------------------------
    public inscribir(id: number): Observable<IResultadoActividad> {

        const ciudadano = this.loginService.getUsuarioActual();

        if (!ciudadano || ciudadano.role !== 'usuario') {
            return of({ ok: false, errores: ['Inicia sesión como ciudadano para inscribirte.'] });
        }

        const ciudadano_id = ciudadano.id;

        const actividad = this.getActividad(id);

        if (!actividad) {
            return of({ ok: false, errores: ['La actividad no existe.'] });
        }

        if (actividad.estado === 'Cancelada') {
            return of({
                ok: false,
                errores: ['No puedes inscribirte: la actividad fue cancelada.']
            });
        }

        if (actividad.inscritos.length >= actividad.capacidad) {
            return of({ ok: false, errores: ['La actividad no tiene cupos disponibles.'] });
        }

        // Comprobar que el ciudadano no esté ya inscrito
        if (actividad.inscritos.includes(ciudadano_id)) {
            return of({ ok: false, errores: ['Ya estás inscrito en esta actividad.'] });
        }

        // Registrar la inscripción
        actividad.inscritos.push(ciudadano_id);
        ciudadano.actividadesAgendadas.push(actividad.id);

        return of({ ok: true, errores: [], actividad: actividad });
    }


    // ------------------------------------------------------------------
    // HU-C10: Cancelar la inscripción del ciudadano
    // ------------------------------------------------------------------
    public cancelarInscripcion(id: number): Observable<IResultadoActividad> {

        const ciudadano = this.loginService.getUsuarioActual();

        if (!ciudadano || ciudadano.role !== 'usuario') {
            return of({ ok: false, errores: ['Inicia sesión como ciudadano para cancelar tu inscripción.'] });
        }

        const ciudadano_id = ciudadano.id;

        const actividad = this.getActividad(id);

        if (!actividad) {
            return of({ ok: false, errores: ['La actividad ya no existe.'] });
        }

        // Comprobar que la inscripción pertenece al ciudadano
        if (!actividad.inscritos.includes(ciudadano_id)) {
            return of({ ok: false, errores: ['No tienes una inscripción en esta actividad.'] });
        }

        // Quitar la inscripción y liberar un solo cupo
        actividad.inscritos = actividad.inscritos.filter(id => id !== ciudadano_id);
        ciudadano.actividadesAgendadas = ciudadano.actividadesAgendadas.filter(id => id !== actividad.id);

        return of({ ok: true, errores: [], actividad: actividad });
    }


    // ------------------------------------------------------------------
    // HU-A09: Controlar inscripciones (admin)
    // Quitar una inscripción y liberar el cupo
    // ------------------------------------------------------------------
    public quitarInscripcion(id: number, ciudadano_id: number): Observable<IResultadoActividad> {

        const ciudadano = this.loginService.getUsers().find(u => u.id === ciudadano_id);

        if (!ciudadano || ciudadano.role !== 'usuario') {
            return of({ ok: false, errores: ['El ciudadano no existe o no es un usuario válido.'] });
        }

        // Precondición: sesión administrativa
        if (!this.loginService.isAdmin()) {
            return of({
                ok: false,
                errores: ['Inicia sesión como administrador para controlar inscripciones.']
            });
        }

        // Precondición: actividad existente
        const actividad = this.getActividad(id);

        if (!actividad) {
            return of({ ok: false, errores: ['La actividad ya no existe.'] });
        }

        // Precondición: ciudadano inscrito en la actividad

        if (!actividad.inscritos.includes(ciudadano_id)) {
            return of({ ok: false, errores: ['El ciudadano no está inscrito en esta actividad.'] });
        }

        // Quitar la inscripción y liberar el cupo
        actividad.inscritos = actividad.inscritos.filter(id => id !== ciudadano_id);
        ciudadano.actividadesAgendadas = ciudadano.actividadesAgendadas.filter(id => id !== actividad.id);


        return of({ ok: true, errores: [], actividad: actividad });
    }

    public inscribirUsuario(id: number, ciudadano_id: number): Observable<IResultadoActividad> {

        const ciudadano = this.loginService.getUsers().find(u => u.id === ciudadano_id);

        if (!ciudadano || ciudadano.role !== 'usuario') {
            return of({ ok: false, errores: ['Inicia sesión como ciudadano para inscribirte.'] });
        }

        const actividad = this.getActividad(id);

        if (!actividad) {
            return of({ ok: false, errores: ['La actividad no existe.'] });
        }

        if (actividad.estado === 'Cancelada') {
            return of({
                ok: false,
                errores: ['No puedes inscribirte: la actividad fue cancelada.']
            });
        }

        if (actividad.inscritos.length >= actividad.capacidad) {
            return of({ ok: false, errores: ['La actividad no tiene cupos disponibles.'] });
        }

        // Comprobar que el ciudadano no esté ya inscrito
        if (actividad.inscritos.includes(ciudadano_id)) {
            return of({ ok: false, errores: ['Ya estás inscrito en esta actividad.'] });
        }

        // Registrar la inscripción
        actividad.inscritos.push(ciudadano_id);
        ciudadano.actividadesAgendadas.push(actividad.id);

        return of({ ok: true, errores: [], actividad: actividad });
    }
}
