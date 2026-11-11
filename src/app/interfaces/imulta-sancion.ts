export enum TipoMultaSancion {
    Multa = 'Multa',
    Sancion = 'Sanción'
}

export enum EstadoMultaSancion {
    Pendiente = 'Pendiente',
    Resuelta = 'Resuelta'
}

export interface IMultaSancion {
    id: number;
    tipo: TipoMultaSancion;
    motivo: string;
    fecha?: string;
    estado: EstadoMultaSancion;
}
