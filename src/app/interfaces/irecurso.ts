export interface IRecurso {
  id: number;
  titulo: string;
  autor: string;
  categoria: string;
  tipo: string;
  ejemplares: number;
  ejemplaresComprometidos: number;
  activo: boolean;
}

export interface IRecursoForm {
  titulo: string;
  autor: string;
  categoria: string;
  tipo: string;
  ejemplares: number;
}

export interface IResultadoRecurso {
  ok: boolean;
  errores: string[];
  recurso?: IRecurso;
}
