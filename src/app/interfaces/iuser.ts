export interface IUser {
    id: number;
    username: string;
    password?: string;
    role: string;
    librosPedidos: number[];
    salasPedidas: number[];
    actividadesAgendadas: number[];
    multas: any[]
}