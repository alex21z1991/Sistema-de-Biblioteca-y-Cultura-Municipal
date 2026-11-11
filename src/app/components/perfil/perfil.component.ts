import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { LoginService } from '../../services/login.service';
import { ReservaService } from '../../services/reserva.service';
import { IReserva } from '../../interfaces/ireserva';
import { IUser } from '../../interfaces/iuser';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit, OnDestroy {
  usuarioActual: IUser | undefined = undefined;
  misReservas: IReserva[] = [];

  nombreForm: string = '';
  nuevaClave: string = '';
  iniciales: string = '';

  private subUser?: Subscription;
  private subReservas?: Subscription;

  constructor(
    private loginService: LoginService,
    private reservaService: ReservaService
  ) {}

  ngOnInit(): void {
    this.subUser = this.loginService.currentUser$.subscribe(user => {
      this.usuarioActual = user;

      if (user) {
        this.nombreForm = user.username;
        this.generarIniciales(user.username);

        this.subReservas = this.reservaService.getMisReservas().subscribe(reservas => {
          this.misReservas = reservas;
        });
      }
    });
  }

  generarIniciales(nombre: string): void {
    if (!nombre) {
      this.iniciales = 'U';
      return;
    }
    const partes = nombre.trim().split(' ');
    this.iniciales = partes.length > 1
      ? (partes[0][0] + partes[1][0]).toUpperCase()
      : partes[0].substring(0, 2).toUpperCase();
  }

  guardarPerfil(): void {
    console.log('Formulario enviado:', {
      nombre: this.nombreForm,
      clave: this.nuevaClave
    });
  }

  ngOnDestroy(): void {
    this.subUser?.unsubscribe();
    this.subReservas?.unsubscribe();
  }
}