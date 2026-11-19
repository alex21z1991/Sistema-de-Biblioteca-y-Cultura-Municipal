// HU-A03: préstamo directo (sin reserva previa)
// Retiro de reserva: el préstamo nace de una reserva pendiente del ciudadano

export enum EstadoPrestamo {
    Prestado = 'Prestado',
    Devuelto = 'Devuelto'
}

export const DIAS_PRESTAMO_POR_DEFECTO = 14;
export const DIAS_PRESTAMO_MAXIMO = 30;

export interface IPrestamo {
    id: number;
    usuarioId: number;
    usuarioNombre: string;
    recursoId: number;
    recursoTitulo: string;
    fechaPrestamo: string;
    fechaDevolucion: string;
    fechaDevolucionReal?: string;
    estado: EstadoPrestamo;
    reservaId?: number;         // solo si el préstamo viene de una reserva
    reservaCodigo?: string;     // comprobante de la reserva, ej. 'RES-0003'
}

export interface IPrestamoForm {
    usuarioId: number | null;
    recursoId: number | null;
    fechaDevolucion: string;
}

export interface IResultadoPrestamo {
    ok: boolean;
    errores: string[];
    prestamo?: IPrestamo;
}

export interface IEstadoPrestamo {
    ok: boolean;
    motivo: string;
}