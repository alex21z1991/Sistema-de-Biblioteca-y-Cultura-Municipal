export enum TipoMultaSancion {
    Multa = 'Multa',
    Sancion = 'Sanción'
}

export enum EstadoMultaSancion {
    Pendiente = 'Pendiente',
    Resuelta = 'Resuelta'
}

// Cómo terminó un registro resuelto
export enum ResolucionMulta {
    Pagada = 'Pagada',          // multa cobrada
    Condonada = 'Condonada',    // multa perdonada por el administrador
    Levantada = 'Levantada'     // sanción retirada (se puede reactivar)
}

export interface IMultaSancion {
    id: number;
    tipo: TipoMultaSancion;
    motivo: string;
    fecha?: string;                  // 'YYYY-MM-DD'
    estado: EstadoMultaSancion;
    monto?: number;                  // solo las multas (pesos chilenos, entero)
    resolucion?: ResolucionMulta;    // solo cuando está resuelta
    fechaResolucion?: string;        // 'YYYY-MM-DD'
}

// ----- HU-A06: gestionar multas y sanciones -----

export const MONTO_MULTA_MAXIMO = 1000;
export const MOTIVO_MINIMO = 3;
export const MOTIVO_MAXIMO = 120;

// Datos que llegan desde el formulario (todavía sin validar)
export interface IMultaForm {
    usuarioId: number | null;
    tipo: TipoMultaSancion;
    motivo: string;
    monto: number | null;
}

export interface IResultadoMulta {
    ok: boolean;
    errores: string[];
    multa?: IMultaSancion;
}

// Fila del listado del administrador: un registro con su ciudadano
export interface IFilaMulta {
    usuarioId: number;
    ciudadano: string;
    multa: IMultaSancion;
}

// 5000 -> "$5.000"
export function formatearMonto(monto: number): string {
    return '$' + Math.round(monto).toLocaleString('en-US');
}
