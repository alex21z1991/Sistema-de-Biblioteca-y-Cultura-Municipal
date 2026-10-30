export interface IDevolucion {
  id: number;
  usuario: string;
  recursoId: number;
  titulo: string;
  fechaPrestamo: string;
  estado: 'Prestado' | 'Devuelto';
  fechaDevolucion?: string;
}
