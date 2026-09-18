import { Inject, Injectable } from '@angular/core';
import { IUserFormLogin } from '../interfaces/iuserformlogin';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root'})

export class LoginService {
    private validUser: IUserFormLogin[] = [
        {username: 'admin', password: 'admin', role: 'admin'},
        {username: 'usuario', password: 'usuario', role: 'usuario'}
        ,];
    
    constructor(private router: Router, private location: Location) {}
}   
