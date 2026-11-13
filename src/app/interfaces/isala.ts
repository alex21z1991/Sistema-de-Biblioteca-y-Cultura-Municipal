// HU-C11: Reservar sala de estudio [Ciudadano]

// Sala de estudio que el ciudadano puede reservar
export interface ISala {
    id: number;
    nombre: string;
    ubicacion: string;
    capacidad: number;          // personas como máximo
    equipamiento: string[];
    activa: boolean;            // false = en mantención, no se ofrece
}

// Estado de una reserva de sala ya registrada
export enum EstadoReservaSala {
    Confirmada = 'Confirmada',
    Cancelada = 'Cancelada'
}

// Reserva de sala registrada para un ciudadano
export interface IReservaSala {
    id: number;
    codigo: string;             // comprobante, ej. 'SAL-0001'
    usuarioId: number;
    salaId: number;
    nombreSala: string;
    fecha: string;              // formato 'YYYY-MM-DD'
    horaInicio: string;         // formato 'HH:mm'
    horaFin: string;            // formato 'HH:mm'
    personas: number;
    fechaSolicitud: string;     // formato 'YYYY-MM-DD'
    estado: EstadoReservaSala;
}

// DTO que viaja desde el formulario (todavía sin validar)
export interface IReservaSalaDto {
    salaId: number | null;
    fecha: string;              // formato 'YYYY-MM-DD'
    horaInicio: string;         // formato 'HH:mm'
    duracion: number;           // horas
    personas: number | null;
}

// Respuesta del servicio al reservar
export interface IResultadoReservaSala {
    ok: boolean;
    errores: string[];
    reserva?: IReservaSala;
}

// Bloque de una hora dentro del horario de la sala
export interface IBloqueHorario {
    hora: string;               // inicio del bloque, 'HH:mm'
    disponible: boolean;
}

// Estados de la vista
export enum EstadoVistaSala {
    Cargando = 'cargando',
    Error = 'error',
    Listo = 'listo',
    Reservando = 'reservando',
    Exito = 'exito'
}
