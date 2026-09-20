import { Injectable } from '@angular/core';
import { IUserFormLogin } from '../interfaces/iuserformlogin';
import { IUser } from '../interfaces/iuser';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

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
            actividadesAgendadas: [43],
            multas: ["demora entrega"]
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
    
    constructor(private router: Router, private location: Location) {}

    //Inicio de sesion
    public login(userLogin: IUserFormLogin): Observable<boolean>{

        const foundUser = this.validUsers.find(
            u => u.username === userLogin.username && u.password === userLogin.password
        );

        if(foundUser){
            const token = btoa(foundUser.username + foundUser.password || '');
            sessionStorage.setItem('token', token);
            sessionStorage.setItem('role', foundUser.role || 'user');
            sessionStorage.setItem('userId', foundUser.id.toString());
            return of(true);
        }

        return of(false);
    }

    //Cerrar sesion
    public logout(): Observable<boolean>{
        if(sessionStorage.getItem('token')){
            sessionStorage.clear();
        }
        return of(true);
    }

    //Metodos de consulta

    public isAuth(): Observable<boolean>{
        return of(!!sessionStorage.getItem('token'));
    }

    public getRole(): string | null {
        return sessionStorage.getItem('role');
    }

    public isAdmin(): boolean {
        return this.getRole() === 'admin';
    }

    public isUser(): boolean {
        return this.getRole() === 'user';
    }
    public getUsers(): IUser[] {
    return this.validUsers;
}
}