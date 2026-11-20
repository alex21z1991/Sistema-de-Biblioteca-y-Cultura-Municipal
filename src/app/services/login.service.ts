import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { IUserFormLogin } from '../interfaces/iuserformlogin';
import { IUser } from '../interfaces/iuser';
import { EstadoMultaSancion, TipoMultaSancion } from '../interfaces/imulta-sancion';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { isPlatformBrowser, Location } from '@angular/common';

@Injectable({ providedIn: 'root'})

export class LoginService {
    private validUsers: IUser[] = [
        {
            id: 1,
            username: 'admin',
            password: 'admin',
            role: 'admin',
            librosPedidos: [],
            salasPedidas: [],
            actividadesAgendadas: [],
            multas: []
        },
        {
            id: 2,
            username: 'usuario',
            password: 'usuario',
            role: 'usuario',
            librosPedidos: [3232,444,445],
            salasPedidas: [1],
            actividadesAgendadas: [1,2],
            multas: [{
                id: 1,
                tipo: TipoMultaSancion.Multa,
                motivo: 'Demora en la entrega',
                estado: EstadoMultaSancion.Pendiente
            }]
        },
        {
            id:3,
            username:"alex",
            password:"alex",
            role:"usuario",
            librosPedidos:[1,2,4],
            salasPedidas:[2],
            actividadesAgendadas:[],
            multas:[]
            
        }
    ];
    
    private currentUser = new BehaviorSubject<IUser | undefined>(undefined);
    readonly currentUser$ = this.currentUser.asObservable();

    constructor(
        private router: Router,
        private location: Location,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        this.currentUser.next(this.getUsuarioActual());
    }

    //Inicio de sesion
    public login(userLogin: IUserFormLogin): Observable<boolean>{

        this.cargarCuentas();
        const foundUser = this.validUsers.find(
            u => u.username === userLogin.username && u.password === userLogin.password
        );

        if(foundUser && foundUser.habilitado !== false){
            const token = btoa(foundUser.username + foundUser.password || '');
            sessionStorage.setItem('token', token);
            sessionStorage.setItem('role', foundUser.role || 'user');
            sessionStorage.setItem('userId', foundUser.id.toString());
            this.currentUser.next(foundUser);
            return of(true);
        }

        return of(false);
    }

    //Cerrar sesion
    public logout(): Observable<boolean>{
        if(sessionStorage.getItem('token')){
            sessionStorage.clear();
        }
        this.currentUser.next(undefined);
        return of(true);
    }

    //Metodos de consulta

    public isAuth(): Observable<boolean>{
        return of(!!this.getUsuarioActual());
    }

    public getRole(): string | null {
        return this.getUsuarioActual()?.role ?? null;
    }

    public isAdmin(): boolean {
        return this.getRole() === 'admin';
    }

    public isUser(): boolean {
        return this.getRole() === 'user';
    }

    // Obtener al usuario de la sesión actual
    public getUsuarioActual(): IUser | undefined {
        if (!isPlatformBrowser(this.platformId)) {
            return undefined;
        }

        if (!sessionStorage.getItem('token')) {
            return undefined;
        }

        this.cargarCuentas();
        const userId = Number(sessionStorage.getItem('userId'));
        return this.validUsers.find(usuario => usuario.id === userId && usuario.habilitado !== false);
    }

    public getUsers(): IUser[] {
    return this.validUsers;
}

    // Ciudadanos (usuarios que no son administradores)
    public getCiudadanos(): IUser[] {
        this.cargarCuentas();
        return this.validUsers.filter(usuario => usuario.role === 'usuario');
    }

    private cargarCuentas(): void {
        if (!isPlatformBrowser(this.platformId)) return;
        try {
            const datos: unknown = JSON.parse(localStorage.getItem('biblioteca.cuentas.v1') || '[]');
            if (!Array.isArray(datos)) return;
            for (const dato of datos) {
                const usuario = this.validUsers.find(u => u.id === dato?.id && u.role === 'usuario');
                if (usuario && typeof dato.username === 'string' && typeof dato.habilitado === 'boolean') {
                    usuario.username = dato.username;
                    usuario.habilitado = dato.habilitado;
                }
            }
        } catch { /* Mantener las cuentas iniciales si el almacenamiento no está disponible. */ }
    }

    public actualizarCuenta(id: number, cambios: { username?: string; habilitado?: boolean }): void {
        if (!this.isAdmin()) throw new Error('Solo el administrador puede gestionar cuentas.');
        const usuario = this.validUsers.find(u => u.id === id && u.role === 'usuario');
        if (!usuario) throw new Error('Usuario no encontrado.');
        const nombre = (cambios.username ?? usuario.username).trim();
        if (!nombre || nombre.length > 50) throw new Error('El nombre debe tener entre 1 y 50 caracteres.');
        if (this.validUsers.some(u => u.id !== id && u.username.toLowerCase() === nombre.toLowerCase())) {
            throw new Error('Ese nombre de usuario ya existe.');
        }
        const habilitado = cambios.habilitado ?? usuario.habilitado !== false;
        const cuentas = this.validUsers.filter(u => u.role === 'usuario').map(u => ({
            id: u.id, username: u.id === id ? nombre : u.username,
            habilitado: u.id === id ? habilitado : u.habilitado !== false
        }));
        try { localStorage.setItem('biblioteca.cuentas.v1', JSON.stringify(cuentas)); }
        catch { throw new Error('No se pudo guardar. Revisa el almacenamiento del navegador.'); }
        usuario.username = nombre;
        usuario.habilitado = habilitado;
    }
}
