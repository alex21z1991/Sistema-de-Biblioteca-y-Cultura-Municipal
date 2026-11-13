
import { Routes } from '@angular/router';

import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { AdminDevolucionComponent } from './components/admin-devolucion/admin-devolucion.component';
import { AdminCatalogoComponent } from './components/admin-catalogo/admin-catalogo.component';
import { LayoutComponent } from './components/layout/layout.component';
import { ExploreComponent } from './components/explore/explore.component';
import { ReservasComponent } from './components/reservas/reservas.component';
import { AdminPrestamosComponent } from './components/admin-prestamos/admin-prestamos.component';
import { ConfirmarReservaComponent } from './components/confirmar-reserva/confirmar-reserva.component';
import { PerfilComponent } from './components/perfil/perfil.component';

import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { CiudadanoGuard } from './guards/ciudadano.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'home',
        component: HomeComponent
      },
      {
        path: 'admin-panel',
        data: { seccion: 'administracion' },
        component: AdminPanelComponent,
        canActivate: [AdminGuard]
      },
      {
        path: 'explorar',
        data: { seccion: 'biblioteca' },
        component: ExploreComponent
      },
      {
        path: 'perfil',
        component: PerfilComponent
      },
      {
        path: 'reservas',
        data: { seccion: 'biblioteca' },
        component: ReservasComponent,
        canActivate: [CiudadanoGuard]
      },
      {
        path: 'historial',
        data: { seccion: 'biblioteca' },
        loadComponent: () =>
          import('./components/historial/historial.component')
            .then(module => module.HistorialComponent),
        canActivate: [CiudadanoGuard]
      },
      {
        path: 'carrito',
        data: { seccion: 'biblioteca' },
        loadComponent: () =>
          import('./components/cart/cart.component')
            .then(module => module.CartComponent),
        canActivate: [CiudadanoGuard]
      },
      {
        path: 'reservas/confirmar',
        data: { seccion: 'biblioteca' },
        component: ConfirmarReservaComponent,
        canActivate: [CiudadanoGuard]
      },
      {
        path: 'salas',
        data: { seccion: 'biblioteca' },
        loadComponent: () =>
          import('./components/reservar-sala/reservar-sala.component')
            .then(module => module.ReservarSalaComponent),
        canActivate: [CiudadanoGuard]
      },
      {
        path: 'admin-devoluciones',
        data: { seccion: 'administracion' },
        component: AdminDevolucionComponent,
        canActivate: [AdminGuard]
      },
      {
        path: 'multas',
        data: { seccion: 'biblioteca' },
        loadComponent: () => import('./components/multas/multas.component').then(module => module.MultasComponent),
        canActivate: [CiudadanoGuard]
      },
      {
        path: 'admin-catalogo',
        data: { seccion: 'administracion' },
        component: AdminCatalogoComponent,
        canActivate: [AdminGuard]
      },
      {
        path: 'admin-prestamos',
        data: { seccion: 'administracion' },
        component: AdminPrestamosComponent,
        canActivate: [AdminGuard]
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
