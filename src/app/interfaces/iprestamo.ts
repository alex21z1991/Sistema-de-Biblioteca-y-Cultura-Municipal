// HU-A03: préstamo directo (sin reserva previa)

export enum EstadoPrestamo {
    Prestado = 'Prestado'
}

// Reglas del préstamo
export const DIAS_PRESTAMO_POR_DEFECTO = 14;
export const DIAS_PRESTAMO_MAXIMO = 30;

// Movimiento "Prestado" registrado por el administrador
export interface IPrestamo {
    id: number;
    usuarioId: number;
    usuarioNombre: string;
    recursoId: number;
    recursoTitulo: string;
    fechaPrestamo: string;     // 'YYYY-MM-DD'
    fechaDevolucion: string;   // 'YYYY-MM-DD'
    estado: EstadoPrestamo;
}

// Datos que llegan desde el formulario (todavía sin validar)
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

// Resultado de revisar si un ciudadano o recurso puede participar en un préstamo
export interface IEstadoPrestamo {
    ok: boolean;
    motivo: string;
}
