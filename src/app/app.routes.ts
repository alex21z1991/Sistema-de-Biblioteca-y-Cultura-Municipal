import { Routes } from '@angular/router';

import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { AdminCatalogoComponent } from './components/admin-catalogo/admin-catalogo.component';

import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { CiudadanoGuard } from './guards/ciudadano.guard';

import { LayoutComponent } from './components/layout/layout.component';
import { ExploreComponent } from './components/explore/explore.component';
import { ConfirmarReservaComponent } from './components/confirmar-reserva/confirmar-reserva.component';


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

            // Ruta de explorar movimientos (usuario)
            {
                path: 'explorar',
                component: ExploreComponent,
            
            },
            
            // HU-C05: confirmar reservas (solo ciudadano)
            {
                path: 'reservas/confirmar',
                component: ConfirmarReservaComponent,
                canActivate: [CiudadanoGuard]
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