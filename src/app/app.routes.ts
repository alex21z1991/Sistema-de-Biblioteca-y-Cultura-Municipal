import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';

import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';


export const routes: Routes = [
    {path: 'login', component: LoginComponent },

    //Ruta de home, cambiar datos de component y imports si es necesario
    {
        path: 'home',
        component: HomeComponent,
        canActivate: [AuthGuard],
    },

    //Ruta de pagina Admin, cambiar datos de component y imports si es necesario
    {
        path: 'admin-panel',
        component: AdminPanelComponent,
        canActivate: [AuthGuard, AdminGuard],
    },

    {path: '', redirectTo: 'login', pathMatch: 'full'}
];
