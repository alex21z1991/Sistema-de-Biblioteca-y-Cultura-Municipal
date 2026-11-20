import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoginService } from '../../services/login.service';
import { IUser } from '../../interfaces/iuser';

@Component({
  selector: 'app-admin-cuentas', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <section class="container py-4">
      <h1>Administrar cuentas de usuarios</h1>
      <p>Consulta usuarios, modifica su nombre de acceso y administra el estado de sus cuentas.</p>
      <p role="status">{{ mensaje }}</p>
      <label for="buscar">Buscar por nombre o ID</label>
      <input id="buscar" class="form-control mb-3" [(ngModel)]="busqueda">
      <label for="estado">Estado</label>
      <select id="estado" class="form-select mb-3" [(ngModel)]="estado">
        <option value="todos">Todos</option><option value="activos">Habilitados</option><option value="inactivos">Deshabilitados</option>
      </select>
      <div class="table-responsive"><table class="table">
        <thead><tr><th>ID</th><th>Usuario</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody><tr *ngFor="let u of usuarios">
          <td>{{u.id}}</td><td>{{u.username}}</td><td>{{u.habilitado === false ? 'Deshabilitado' : 'Habilitado'}}</td>
          <td><button class="btn btn-outline-primary me-2" (click)="editar(u)">Editar</button>
          <button class="btn btn-outline-secondary" (click)="pendiente = u">{{u.habilitado === false ? 'Habilitar' : 'Deshabilitar'}}</button></td>
        </tr><tr *ngIf="!usuarios.length"><td colspan="4">No hay usuarios que coincidan con la búsqueda.</td></tr></tbody>
      </table></div>
      <form *ngIf="seleccionado" (ngSubmit)="guardar()" class="card p-3">
        <h2>Editar usuario #{{seleccionado.id}}</h2>
        <label for="nombre">Nombre de usuario</label>
        <input id="nombre" name="nombre" class="form-control mb-3" [(ngModel)]="nombre" required maxlength="50">
        <div><button class="btn btn-primary me-2" type="submit">Guardar cambios</button><button class="btn btn-secondary" type="button" (click)="seleccionado = undefined">Cancelar</button></div>
      </form>
      <div *ngIf="pendiente" class="alert alert-warning" role="alert">
        <p>¿{{pendiente.habilitado === false ? 'Habilitar' : 'Deshabilitar'}} la cuenta de {{pendiente.username}}? Sus registros se conservarán.</p>
        <button class="btn btn-primary me-2" (click)="cambiarEstado()">Confirmar</button><button class="btn btn-secondary" (click)="pendiente = undefined">Cancelar</button>
      </div>
    </section>`
})
export class AdminCuentasComponent {
  busqueda = ''; estado = 'todos'; mensaje = ''; nombre = '';
  seleccionado?: IUser; pendiente?: IUser;
  constructor(private login: LoginService) {}
  get usuarios(): IUser[] {
    if (!this.login.isAdmin()) return [];
    const texto = this.busqueda.trim().toLowerCase();
    return this.login.getCiudadanos().filter(u =>
      (u.username.toLowerCase().includes(texto) || String(u.id).includes(texto)) &&
      (this.estado === 'todos' || (this.estado === 'activos' ? u.habilitado !== false : u.habilitado === false)));
  }
  editar(u: IUser): void { this.seleccionado = u; this.nombre = u.username; this.mensaje = ''; }
  guardar(): void {
    if (!this.seleccionado) return;
    try { this.login.actualizarCuenta(this.seleccionado.id, { username: this.nombre }); this.seleccionado = undefined; this.mensaje = 'Datos guardados.'; }
    catch (e) { this.mensaje = e instanceof Error ? e.message : 'No se pudieron guardar los cambios.'; }
  }
  cambiarEstado(): void {
    if (!this.pendiente) return;
    try { this.login.actualizarCuenta(this.pendiente.id, { habilitado: this.pendiente.habilitado === false }); this.pendiente = undefined; this.mensaje = 'Estado actualizado.'; }
    catch (e) { this.mensaje = e instanceof Error ? e.message : 'No se pudo actualizar el estado.'; }
  }
}
