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
  styleUrl: './login.component.css'
})
export class LoginComponent {

  loginData: IUserFormLogin{
    username: '',
    password: '',
  }

  errorMessage: string = '';

  constructor(
    private loginService: LoginService,
    private router: Router,
  ){}

  onSubmit(): void {
    const exito = this.loginService.login(
      this.loginData
    );
  }
}
