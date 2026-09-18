import { Injectable } from '@angular/core';
import { IUserFormLogin } from '../interfaces/iuserformlogin';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Injectable({ providedIn: 'root'})

export class LoginService {
    private validUsers: IUserFormLogin[] = [
        {username: 'admin', password: 'admin', role: 'admin'},
        {username: 'usuario', password: 'usuario', role: 'usuario'}
        ,];
    
    constructor(private router: Router, private location: Location) {}

    //Inicio de sesion
    public login(userLogin: IUserFormLogin): Observable<boolean>{

        const foundUser = this.validUsers.find(
            u => u.username === userLogin.username && u.password === userLogin.password
        );

        if(foundUser){
            const token = btoa(foundUser.username + foundUser.password);
            sessionStorage.setItem('token', token);
            sessionStorage.setItem('role', foundUser.role || 'user');
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
}