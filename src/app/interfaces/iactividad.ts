// Actividad de la cartelera municipal (talleres y eventos)
export interface IActividad {
    id: number;
    titulo: string;
    tipo: 'Taller' | 'Evento';
    lugar: string;
    descripcion: string;
    fecha: string;      // formato 'YYYY-MM-DDTHH:mm' (input datetime-local)
    capacidad: number;
    inscritos: number;  // inscripciones ya registradas
    estado: 'Activa' | 'Cancelada';
}

// Datos que viajan desde el formulario (todavía sin validar)
export interface IActividadForm {
    titulo: string;
    tipo: 'Taller' | 'Evento';
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
