import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoginService } from '../../services/login.service';
import { Router } from '@angular/router';
import { IUserFormLogin } from '../../interfaces/iuserformlogin';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {

  loginData: IUserFormLogin = {
    username: '',
    password: ''
  }

  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private loginService: LoginService,
    private router: Router
  ){}

  onSubmit(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.loginService.login(this.loginData).subscribe({
      next: (isValid: boolean) => {
        this.isLoading = false;
        if (isValid){
          if (this.loginService.isAdmin()){
            this.router.navigate(['/admin-panel']);
          } else {
            this.router.navigate(['/home']);
          }
        } else {
          this.errorMessage = 'Credenciales incorrectas o usuario no encontrado';
        }  
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error en el proceso:', err);
        this.errorMessage = 'Ocurrio un error inesperado.';
      }
    });
  }
}