import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import {
    IActividad,
    IActividadForm,
    IResultadoActividad
} from '../interfaces/iactividad';

import { LoginService } from './login.service';

@Injectable({ providedIn: 'root' })
export class ActividadService {

    // Cartelera en memoria (mismo enfoque que LoginService)
    private actividades: IActividad[] = [
        {
            id: 1,
            titulo: 'Taller de encuadernación artesanal',
            tipo: 'Taller',
            lugar: 'Sala de talleres, piso 2',
            descripcion: 'Cuatro sesiones para aprender costura copta y tapa dura.',
            fecha: '2026-10-15T18:30',
            capacidad: 20,
            inscritos: 12,
            estado: 'Activa'
        },
        {
            id: 2,
            titulo: 'Cuentacuentos infantil',
            tipo: 'Evento',
            lugar: 'Sala infantil',
            descripcion: 'Lectura en voz alta para niños de 4 a 8 años.',
            fecha: '2026-11-03T11:00',
            capacidad: 40,
            inscritos: 8,
            estado: 'Activa'
        },
        {
            id: 3,
            titulo: 'Club de lectura: narrativa nortina',
            tipo: 'Evento',
            lugar: 'Auditorio municipal',
            descripcion: 'Conversación mensual sobre autores de la región.',
            fecha: '2026-12-05T19:00',
            capacidad: 30,
            inscritos: 30,
            estado: 'Activa'
        },
        {
            id: 4,
            titulo: 'Taller de programación en Python',
            tipo: 'Taller',
            lugar: 'Laboratorio de computación',
            descripcion: 'Introducción básica a algoritmos y lógica de programación para principiantes.',
            fecha: '2026-10-20T17:00',
            capacidad: 15,
            inscritos: 15,
            estado: 'Activa'
        },
        {
            id: 5,
            titulo: 'Concierto de la Orquesta Juvenil',
            tipo: 'Evento',
            lugar: 'Teatro Municipal',
            descripcion: 'Presentación musical cultural',
            fecha: '2026-11-12T19:30',
            capacidad: 100,
            inscritos: 45,
            estado: 'Activa'
        },
        {
            id: 6,
            titulo: 'Taller de fotografía urbana',
            tipo: 'Taller',
            lugar: 'Patio central de la biblioteca',
            descripcion: 'Aprende encuadre, manejo de luz e historia visual utilizando tu teléfono o cámara.',
            fecha: '2026-11-18T16:00',
            capacidad: 12,
            inscritos: 2,
            estado: 'Activa'
        },
        {
            id: 7,
            titulo: 'Feria del libro usado y trueque',
            tipo: 'Evento',
            lugar: 'Plaza de las Artes',
            descripcion: 'Espacio comunitario para intercambiar libros, revistas y cómics en buen estado.',
            fecha: '2026-12-01T10:00',
            capacidad: 50,
            inscritos: 18,
            estado: 'Activa'
        },
        {
            id: 8,
            titulo: 'Taller de huerto urbano y compostaje',
            tipo: 'Taller',
            lugar: 'Jardín botánico municipal',
            descripcion: 'Aprende a cultivar tus propias hortalizas y reutilizar residuos orgánicos en casa.',
            fecha: '2026-12-10T09:30',
            capacidad: 25,
            inscritos: 24,
            estado: 'Activa'
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
            capacidad: Number(datos.capacidad),
            inscritos: 0,
            estado: 'Activa'
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

        actividad.estado = actividad.estado === 'Activa' ? 'Cancelada' : 'Activa';

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

        // ----- Capacidad -----
        const capacidad = Number(datos.capacidad);

        if (datos.capacidad === null || datos.capacidad === undefined || isNaN(capacidad)) {
            errores.push('Ingresa la capacidad de la actividad.');

        } else if (!Number.isInteger(capacidad)) {
            errores.push('La capacidad debe ser un número entero.');

        } else if (capacidad < 1) {
            errores.push('La capacidad debe ser de al menos 1 cupo.');

        } else if (actual && capacidad < actual.inscritos) {
            // Excepción: no reducir capacidad bajo las inscripciones existentes
            errores.push(
                'No puedes dejar la capacidad en ' + capacidad +
                ': la actividad ya tiene ' + actual.inscritos + ' inscripción(es) registrada(s). ' +
                'El mínimo permitido es ' + actual.inscritos + '.'
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

        return errores;
    }


    // ------------------------------------------------------------------
    // Apoyo para pruebas / demo: simular una inscripción
    // ------------------------------------------------------------------
    public inscribir(id: number): Observable<IResultadoActividad> {

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

        if (actividad.inscritos >= actividad.capacidad) {
            return of({ ok: false, errores: ['La actividad no tiene cupos disponibles.'] });
        }

        actividad.inscritos++;

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

        const actividad = this.getActividad(id);

        if (!actividad) {
            return of({ ok: false, errores: ['La actividad ya no existe.'] });
        }

        // Comprobar que la inscripción pertenece al ciudadano
        const posicion = ciudadano.actividadesAgendadas.indexOf(id);

        if (posicion === -1) {
            return of({ ok: false, errores: ['No tienes una inscripción en esta actividad.'] });
        }

        if (actividad.inscritos <= 0) {
            return of({ ok: false, errores: ['No se pudo cancelar: revisa la ocupación con el administrador.'] });
        }

        // Quitar la inscripción y liberar un solo cupo
        ciudadano.actividadesAgendadas.splice(posicion, 1);
        actividad.inscritos--;

        return of({ ok: true, errores: [], actividad: actividad });
    }


    // ------------------------------------------------------------------
    // HU-A09: Controlar inscripciones (admin)
    // Quitar una inscripción y liberar el cupo
    // ------------------------------------------------------------------
    public quitarInscripcion(id: number): Observable<IResultadoActividad> {

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

        if (actividad.inscritos <= 0) {
            return of({ ok: false, errores: ['La actividad no tiene inscripciones que quitar.'] });
        }

        // Quitar la inscripción y liberar el cupo
        actividad.inscritos--;

        return of({ ok: true, errores: [], actividad: actividad });
    }
}
