import { Inject, Injectable, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { CanActivate, Router } from "@angular/router";
import { LoginService } from "../services/login.service";

// Solo deja pasar a ciudadanos (rol 'usuario'). El administrador vuelve a su panel.
@Injectable({
  providedIn: 'root'
})
export class CiudadanoGuard implements CanActivate {

  constructor(
    private loginService: LoginService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ){}

  canActivate(): boolean {

    // En el servidor (SSR) no hay sessionStorage: el navegador vuelve a evaluar la ruta
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }

    if (this.loginService.getRole() === 'usuario') {
      return true;
    }

    this.router.navigate([this.loginService.isAdmin() ? '/admin-panel' : '/login']);
    return false;
  }
}
