// HU-C05: Confirmar reservas [Ciudadano]

// Estado de una reserva ya registrada
export enum EstadoReserva {
    PendienteRetiro = 'Pendiente de retiro',
    Retirada = 'Retirada',
    Cancelada = 'Cancelada'
}

// Estados de la vista de confirmación (carga / vacío / error / éxito)
export enum EstadoVistaReserva {
    Cargando = 'cargando',
    Vacio = 'vacio',
    Listo = 'listo',        // hay recursos seleccionados, esperando confirmación
    Confirmando = 'confirmando',
    Error = 'error',        // no se pudo cargar la selección
    Exito = 'exito'
}

// Reserva registrada para un ciudadano
export interface IReserva {
    id: number;
    codigo: string;             // comprobante, ej. 'RES-0001'
    usuarioId: number;
    recursoId: number;
    tituloRecurso: string;
    fechaSolicitud: string;     // formato 'YYYY-MM-DD'
    fechaRetiro: string;        // formato 'YYYY-MM-DD'
    estado: EstadoReserva;
}

// DTO que viaja desde el formulario de confirmación (todavía sin validar)
export interface IConfirmarReservaDto {
    recursosIds: number[];
    fechaRetiro: string;        // formato 'YYYY-MM-DD'
    aceptaCondiciones: boolean;
}

// Respuesta del servicio al confirmar
export interface IResultadoReserva {
    ok: boolean;
    errores: string[];
    reservas?: IReserva[];
}

// Préstamo activo creado al entregar una reserva (HU-A04).
// Los campos opcionales permiten que HU-A03 y HU-A05 se agreguen después
// sin cambiar la estructura de los préstamos creados por esta historia.
export interface IPrestamo {
    id: number;
    origen: 'reserva' | 'directo';
    reservaId?: number;
    usuarioId: number;
    recursoId: number;
    tituloRecurso: string;
    fechaEntrega: string;
    fechaDevolucionPrevista: string;
    fechaDevolucionReal?: string;
    activo: boolean;
}

export interface IResultadoEntrega {
    ok: boolean;
    errores: string[];
    prestamos?: IPrestamo[];
}
