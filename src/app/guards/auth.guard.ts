import { Injectable } from '@angular/core';
import { CanActivate, Route, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs';
import { LoginService } from '../services/login.service';



@Injectable({
  providedIn: 'root'
})  
export class AuthGuard implements CanActivate{

  constructor(
    private loginService: LoginService,
    private router: Router,
  ){}

  canActivate(): Observable<boolean>{
    return this.loginService.isAuth().pipe(
      map(isAuth => {
        if (isAuth){
          return true
        } else {
          this.router.navigate(['/login']);
          return false;
        }
      })
    )
  }
}