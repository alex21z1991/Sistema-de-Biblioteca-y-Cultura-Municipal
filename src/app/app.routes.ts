import { Routes } from '@angular/router';

import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { AdminCatalogoComponent } from './components/admin-catalogo/admin-catalogo.component';

import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

import { LayoutComponent } from './components/layout/layout.component';


export const routes: Routes = [

    { 
        path: 'login', 
        component: LoginComponent 
    },

    // Layout principal del sistema
    {
        path: '',
        component: LayoutComponent,
        canActivate: [AuthGuard],

        children: [

            // Ruta de home
            {
                path: 'home',
                component: HomeComponent
            },

            // Ruta de página Admin
            {
                path: 'admin-panel',
                component: AdminPanelComponent,
                canActivate: [AdminGuard]
            },

            // HU-A02: gestión del catálogo
            {
                path: 'admin-catalogo',
                component: AdminCatalogoComponent,
                canActivate: [AdminGuard]
            }

        ]
    },

    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    }

];