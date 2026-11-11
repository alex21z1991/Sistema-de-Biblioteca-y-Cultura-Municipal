import { IMultaSancion } from './imulta-sancion';

export interface IUser {
    id: number;
    username: string;
    password?: string;
    role: string;
    librosPedidos: number[];
    salasPedidas: number[];
    actividadesAgendadas: number[];
    multas: IMultaSancion[];
    habilitado?: boolean;   // false = cuenta inhabilitada (no puede recibir préstamos)
}
