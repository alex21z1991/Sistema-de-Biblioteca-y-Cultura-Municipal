export type EstadoHistorial =
  | 'Reservado'
  | 'Prestado'
  | 'Devuelto'
  | 'Cancelado';

export interface IHistorial {
  id: number;
  usuarioId: number;
  recursoId: number;
  tituloRecurso: string;

  fechaMovimiento: string;
  fechaReserva?: string;
  fechaPrestamo?: string;
  fechaDevolucion?: string;
  fechaDevolucionReal?: string;

  estado: EstadoHistorial;

  tipo: 'Reserva' | 'Préstamo';
}