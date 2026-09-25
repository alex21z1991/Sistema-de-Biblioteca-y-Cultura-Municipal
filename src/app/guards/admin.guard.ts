import { Injectable } from "@angular/core";
import { CanActivate, Router } from "@angular/router";
import { LoginService } from "../services/login.service";

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(
    private loginService: LoginService,
    private router: Router,
  ){}

  canActivate(): boolean {

    if (this.loginService.isAdmin()) {
      return true
    }

    this.router.navigate(['/home']); //CAMBIAR POR VISTA DE USUARIO EN EL FUTURO
    return false;
  }
}