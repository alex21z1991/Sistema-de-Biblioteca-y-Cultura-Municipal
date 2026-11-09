// Listas de opciones para los formularios (catálogo y cartelera).
// Se mantienen en un solo lugar para reutilizarlas en componentes y validaciones.

// ---------------------------------------------------------------------
// Catálogo: tipos de recurso
// ---------------------------------------------------------------------
export const TIPOS_RECURSO: string[] = [
  'Libro',
  'Libro electrónico (e-book)',
  'Audiolibro',
  'Revista',
  'Periódico',
  'Cómic / Novela gráfica',
  'Manga',
  'Partitura',
  'Mapa / Atlas',
  'Tesis / Documento académico',
  'Folleto / Documento municipal',
  'Manuscrito / Archivo histórico',
  'Película / DVD',
  'Música / CD',
  'Juego de mesa',
  'Material didáctico',
  'Otro'
];

// ---------------------------------------------------------------------
// Catálogo: categorías (agrupadas como en una biblioteca pública grande)
// ---------------------------------------------------------------------
export interface IGrupoCategorias {
  grupo: string;
  categorias: string[];
}

export const GRUPOS_CATEGORIAS: IGrupoCategorias[] = [
  {
    grupo: 'Ficción',
    categorias: [
      'Literatura',
      'Novela contemporánea',
      'Novela histórica',
      'Ciencia ficción',
      'Fantasía',
      'Misterio y suspenso',
      'Novela negra / policial',
      'Terror',
      'Romance',
      'Aventura',
      'Humor y sátira',
      'Cuentos y relatos',
      'Clásicos de la literatura'
    ]
  },
  {
    grupo: 'No ficción',
    categorias: [
      'Biografías y memorias',
      'Autobiografías',
      'Ensayo',
      'Periodismo y crónica',
      'Testimonios',
      'Viajes y turismo',
      'Cartas y diarios'
    ]
  },
  {
    grupo: 'Ciencias y tecnología',
    categorias: [
      'Ciencia',
      'Matemáticas',
      'Física y astronomía',
      'Química',
      'Biología',
      'Ciencias de la Tierra y geología',
      'Medio ambiente y ecología',
      'Medicina y salud',
      'Informática y programación',
      'Ingeniería y tecnología',
      'Inteligencia artificial y robótica'
    ]
  },
  {
    grupo: 'Ciencias sociales y humanidades',
    categorias: [
      'Historia',
      'Historia de Chile',
      'Historia universal',
      'Geografía',
      'Filosofía',
      'Psicología',
      'Sociología',
      'Antropología y arqueología',
      'Política y gobierno',
      'Derecho',
      'Economía',
      'Educación y pedagogía',
      'Religión y espiritualidad',
      'Lingüística e idiomas'
    ]
  },
  {
    grupo: 'Arte y cultura',
    categorias: [
      'Arte',
      'Arquitectura y urbanismo',
      'Fotografía',
      'Cine y televisión',
      'Música',
      'Teatro y artes escénicas',
      'Danza',
      'Diseño y moda',
      'Poesía',
      'Teatro (dramaturgia)',
      'Crítica literaria'
    ]
  },
  {
    grupo: 'Vida cotidiana',
    categorias: [
      'Cocina y gastronomía',
      'Jardinería y huerto',
      'Manualidades y oficios',
      'Bricolaje y hogar',
      'Mascotas y animales',
      'Deportes y recreación',
      'Salud y bienestar',
      'Maternidad y crianza',
      'Desarrollo personal',
      'Negocios y emprendimiento',
      'Finanzas personales',
      'Trabajo y empleo'
    ]
  },
  {
    grupo: 'Infantil y juvenil',
    categorias: [
      'Infantil (0 a 5 años)',
      'Infantil (6 a 12 años)',
      'Juvenil / Young adult',
      'Libros ilustrados / álbum',
      'Cuentos infantiles',
      'Educación inicial'
    ]
  },
  {
    grupo: 'Referencia y fondos especiales',
    categorias: [
      'Obras de referencia',
      'Diccionarios y enciclopedias',
      'Atlas y mapas',
      'Biblioteca local y regional',
      'Pueblos originarios',
      'Documentos municipales',
      'Literatura en otros idiomas',
      'Lectura fácil / accesible',
      'Otra'
    ]
  }
];

// Lista plana (útil para validar o buscar)
export const CATEGORIAS_RECURSO: string[] = GRUPOS_CATEGORIAS.flatMap(g => g.categorias);

// ---------------------------------------------------------------------
// Cartelera: lugares (inventados) y su aforo (cupo máximo de personas)
// ---------------------------------------------------------------------
export interface ILugar {
  nombre: string;
  aforo: number;
}

export const LUGARES_ACTIVIDAD: ILugar[] = [
  { nombre: 'Sala de talleres, piso 2', aforo: 25 },
  { nombre: 'Sala infantil', aforo: 40 },
  { nombre: 'Auditorio municipal', aforo: 80 },
  { nombre: 'Laboratorio de computación', aforo: 20 },
  { nombre: 'Teatro Municipal', aforo: 250 },
  { nombre: 'Patio central de la biblioteca', aforo: 30 },
  { nombre: 'Plaza de las Artes', aforo: 150 },
  { nombre: 'Jardín botánico municipal', aforo: 40 },
  { nombre: 'Sala Gabriela Mistral', aforo: 60 },
  { nombre: 'Sala Pablo Neruda, piso 1', aforo: 50 },
  { nombre: 'Sala de lectura silenciosa, piso 3', aforo: 35 },
  { nombre: 'Salón de los Espejos', aforo: 45 },
  { nombre: 'Terraza Mirador del Desierto', aforo: 70 },
  { nombre: 'Anfiteatro Los Andes', aforo: 200 },
  { nombre: 'Galería de Arte Atacama', aforo: 50 },
  { nombre: 'Sala multiuso Altiplano', aforo: 60 },
  { nombre: 'Sala de música y ensayo', aforo: 15 },
  { nombre: 'Estudio de audio y podcast', aforo: 8 },
  { nombre: 'Taller de cerámica y oficios', aforo: 18 },
  { nombre: 'Cine club, sótano', aforo: 55 },
  { nombre: 'Hemeroteca, piso 2', aforo: 30 },
  { nombre: 'Biblioteca móvil (Bibliobús)', aforo: 12 },
  { nombre: 'Centro Cultural del Barrio Norte', aforo: 120 },
  { nombre: 'Casa de la Cultura Los Naranjos', aforo: 65 },
  { nombre: 'Parque Municipal, escenario principal', aforo: 500 },
  { nombre: 'Plaza Fundadores', aforo: 300 }
];

// Aforo de un lugar por su nombre (undefined si el lugar no está en la lista)
export function aforoDeLugar(nombre: string | null | undefined): number | undefined {
  return LUGARES_ACTIVIDAD.find(l => l.nombre === nombre)?.aforo;
}


// ---------------------------------------------------------------------
// Cartelera: horario y duración
// ---------------------------------------------------------------------
export const DURACIONES_RAPIDAS: number[] = [30, 60, 90, 120, 180, 240];
export const DURACION_MINIMA = 15;
export const DURACION_MAXIMA = 720; // 12 horas
export const DURACION_POR_DEFECTO = 60;

// Horas de inicio ofrecidas (cada 30 minutos, de 08:00 a 22:00)
export const HORAS_INICIO: string[] = Array.from({ length: 29 }, (_, i) => {
  const minutos = 8 * 60 + i * 30;
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
});

// 90 -> "1 h 30 min" | 120 -> "2 h" | 45 -> "45 min"
export function formatearDuracion(minutos: number): string {
  const m = Math.round(Number(minutos) || 0);
  const horas = Math.floor(m / 60);
  const resto = m % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

// Fecha de término a partir del inicio ('YYYY-MM-DDTHH:mm') y la duración
export function fechaFin(inicio: string, minutos: number): Date | null {
  const d = new Date(inicio);
  if (!inicio || isNaN(d.getTime())) return null;
  return new Date(d.getTime() + (Number(minutos) || 0) * 60000);
}

// Hora de término "HH:mm" (agrega "(+1 día)" si cruza la medianoche)
export function horaFin(inicio: string, minutos: number): string {
  const fin = fechaFin(inicio, minutos);
  if (!fin) return '';
  const hh = String(fin.getHours()).padStart(2, '0');
  const mm = String(fin.getMinutes()).padStart(2, '0');
  const cruza = fin.toDateString() !== new Date(inicio).toDateString();
  return `${hh}:${mm}${cruza ? ' (+1 día)' : ''}`;
}
