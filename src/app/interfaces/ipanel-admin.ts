// HU-A12: Consultar panel administrativo [Administrador]

// Estados de la vista (carga / error / listo)
export enum EstadoVistaPanel {
    Cargando = 'cargando',
    Error = 'error',
    Listo = 'listo'
}

// Tono visual de una tarjeta o alerta
export enum TonoIndicador {
    Normal = 'normal',
    Exito = 'exito',
    Aviso = 'aviso',
    Peligro = 'peligro'
}

// Tipo de movimiento que aparece en la línea de tiempo
export enum TipoMovimiento {
    Reserva = 'Reserva',
    Prestamo = 'Préstamo',
    Devolucion = 'Devolución'
}

export interface IResumenRecursos {
    total: number;
    activos: number;
    dadosDeBaja: number;
    ejemplares: number;
    ejemplaresDisponibles: number;
    sinStock: number;           // recursos activos sin ejemplares libres
}

export interface IResumenMovimientos {
    prestamosActivos: number;
    prestamosVencidos: number;
    devoluciones: number;
    reservasPorRetirar: number;
    retirosHoy: number;         // reservas que se deben retirar hoy
    recientes: IMovimiento[];
}

export interface IMovimiento {
    tipo: TipoMovimiento;
    fecha: string;              // 'YYYY-MM-DD'
    recurso: string;
    usuario: string;
    detalle: string;
}

export interface IResumenMultas {
    pendientes: number;
    resueltas: number;
    ciudadanosConPendientes: string[];
    cuentasInhabilitadas: number;
}

export interface IResumenActividades {
    proximas: number;
    canceladas: number;
    inscritos: number;
    ocupacion: number;          // % de cupos ocupados en las próximas actividades
    llenas: number;
    siguientes: IActividadResumen[];
}

export interface IActividadResumen {
    id: number;
    titulo: string;
    fecha: string;              // 'YYYY-MM-DDTHH:mm'
    lugar: string;
    inscritos: number;
    capacidad: number;
}

export interface IResumenSalas {
    activas: number;
    enMantencion: number;
    reservasHoy: number;
    reservasProximas: number;
    proximas: IReservaSalaResumen[];
}

export interface IReservaSalaResumen {
    codigo: string;
    sala: string;
    fecha: string;              // 'YYYY-MM-DD'
    horario: string;            // '10:00 – 12:00'
    personas: number;
    usuario: string;
}

// Avisos que requieren acción del administrador
export interface IAlertaOperativa {
    tono: TonoIndicador;
    mensaje: string;
    enlace: string;             // ruta donde se resuelve
    fragmento?: string;         // ancla dentro de esa ruta
    textoEnlace: string;
}

// DTO completo que entrega el servicio a la vista
export interface IResumenPanel {
    generadoEn: Date;
    recursos: IResumenRecursos;
    movimientos: IResumenMovimientos;
    multas: IResumenMultas;
    actividades: IResumenActividades;
    salas: IResumenSalas;
    alertas: IAlertaOperativa[];
}
