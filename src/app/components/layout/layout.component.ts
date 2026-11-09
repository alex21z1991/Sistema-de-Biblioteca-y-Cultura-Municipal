import { Component } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';

import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    NavbarComponent,
    SidebarComponent,
    FooterComponent
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  constructor(private ruta: ActivatedRoute) {}

  get seccion(): 'biblioteca' | 'administracion' | undefined {
    return this.ruta.firstChild?.snapshot.data['seccion'];
  }
}
