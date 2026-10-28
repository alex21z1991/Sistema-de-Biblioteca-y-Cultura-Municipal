import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, merge, of, Subject, switchMap } from 'rxjs';

import { CartViewState } from '../../interfaces/cart';
import { IRecurso } from '../../interfaces/irecurso';
import { ReservaService } from '../../services/reserva.service';
import { ResumenReservaComponent } from '../resumen-reserva/resumen-reserva.component';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, ResumenReservaComponent],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent implements OnInit {
  readonly State = CartViewState;
  state = CartViewState.Loading;
  resources: IRecurso[] = [];
  missingIds: number[] = [];
  warnings: string[] = [];
  message = '';

  private destroyRef = inject(DestroyRef);
  private refresh = new Subject<void>();

  constructor(private reservaService: ReservaService) {}

  ngOnInit(): void {
    merge(this.reservaService.seleccion$, this.refresh).pipe(
      switchMap(() => {
        this.state = CartViewState.Loading;
        return this.reservaService.getResumenSeleccion().pipe(
          catchError(() => of(null))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(resources => {
      if (resources === null) {
        this.state = CartViewState.Error;
        return;
      }

      const ids = this.reservaService.getSeleccionIds();
      this.resources = resources;
      this.missingIds = ids.filter(id => !resources.some(resource => resource.id === id));
      this.warnings = this.reservaService.getCartWarnings();
      this.state = ids.length ? CartViewState.Ready : CartViewState.Empty;
    });
  }

  get hasUnavailableResources(): boolean {
    return this.missingIds.length > 0 || this.resources.some(resource =>
      !resource.activo || this.reservaService.disponibles(resource) === 0
    );
  }

  get canContinue(): boolean {
    return !this.hasUnavailableResources && this.warnings.length === 0;
  }

  removeResource(resource: IRecurso): void {
    this.reservaService.quitarDeSeleccion(resource.id);
    this.message = `Quitaste “${resource.titulo}” del carrito.`;
  }

  removeMissingResource(id: number): void {
    this.reservaService.quitarDeSeleccion(id);
    this.message = 'Quitaste el recurso que ya no está en el catálogo.';
  }

  retry(): void {
    this.refresh.next();
  }
}
