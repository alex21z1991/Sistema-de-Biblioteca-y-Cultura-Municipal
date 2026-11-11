import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { EstadoMultaSancion } from '../interfaces/imulta-sancion';
import { IUser } from '../interfaces/iuser';
import { LoginService } from './login.service';

@Injectable({ providedIn: 'root' })
export class MultasService {
    readonly misMultas$ = this.loginService.currentUser$.pipe(
        map(usuario => usuario?.role === 'usuario'
            ? usuario.multas.map(registro => ({ ...registro }))
            : [])
    );

    constructor(private loginService: LoginService) {}

    // Multas y sanciones pendientes: bloquean reservas y préstamos
    contarPendientes(usuario: IUser): number {
        return usuario.multas.filter(registro =>
            registro.estado === EstadoMultaSancion.Pendiente
        ).length;
    }

    textoPendientes(cantidad: number): string {
        return cantidad === 1
            ? '1 multa o sanción pendiente'
            : cantidad + ' multas o sanciones pendientes';
    }
}
