//Nuevos enum
export enum TipoActividad {
    Taller = 'Taller',
    Evento = 'Evento'
}

export enum EstadoActividad {
    Activa = 'Activa',
    Cancelada = 'Cancelada'
}

export enum FiltroActividad {
    Todos = 'Todos',
    Taller = 'Taller',
    Evento = 'Evento',
}

// Actividad de la cartelera municipal (talleres y eventos)
export interface IActividad {
    id: number;
    titulo: string;
    tipo: TipoActividad; //Cambio a enum
    lugar: string;
    descripcion: string;
    fecha: string;      // formato 'YYYY-MM-DDTHH:mm' (input datetime-local)
    capacidad: number;
    inscritos: number;  // inscripciones ya registradas
    estado: EstadoActividad; //Cambio a enum
}

// Datos que viajan desde el formulario (todavía sin validar)
export interface IActividadForm {
    titulo: string;
    tipo: TipoActividad; //Cambio a enum
    lugar: string;
    descripcion: string;
    fecha: string;
    capacidad: number;
}

// Respuesta del servicio al crear o editar
export interface IResultadoActividad {
    ok: boolean;
    errores: string[];
    actividad?: IActividad;
}
