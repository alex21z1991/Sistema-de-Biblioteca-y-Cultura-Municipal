
import { Routes } from '@angular/router';

import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { AdminCatalogoComponent } from './components/admin-catalogo/admin-catalogo.component';
import { LayoutComponent } from './components/layout/layout.component';
import { ExploreComponent } from './components/explore/explore.component';
import { ReservasComponent } from './components/reservas/reservas.component';
import { ConfirmarReservaComponent } from './components/confirmar-reserva/confirmar-reserva.component';

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
        component: AdminPanelComponent,
        canActivate: [AdminGuard]
      },
      {
        path: 'explorar',
        component: ExploreComponent
      },
      {
        path: 'reservas',
        component: ReservasComponent,
        canActivate: [CiudadanoGuard]
      },
      {
        path: 'carrito',
        loadComponent: () => import('./components/cart/cart.component').then(module => module.CartComponent),
        canActivate: [CiudadanoGuard]
      },
      {
        path: 'reservas/confirmar',
        component: ConfirmarReservaComponent,
        canActivate: [CiudadanoGuard]
      },
      {
        path: 'admin-catalogo',
        component: AdminCatalogoComponent,
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
