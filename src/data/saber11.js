// Estructura estándar del ICFES para Saber 11 (grado 11°).
// Los datos migrados traen "Área" + "Aprendizaje" (texto) pero no la competencia;
// acá está el catálogo de competencias por área y un clasificador best-effort
// que asigna cada aprendizaje a una competencia por palabras clave.

export const AREAS = [
  'Lectura Crítica',
  'Matemáticas',
  'Sociales y Ciudadanas',
  'Ciencias Naturales',
  'Inglés',
]

// Nombres cortos de área, para headers de tabla/gráfico angostos.
export const AREAS_CORTO = {
  'Lectura Crítica': 'Lect. Crítica',
  Matemáticas: 'Matemát.',
  'Sociales y Ciudadanas': 'Sociales',
  'Ciencias Naturales': 'Ciencias',
  Inglés: 'Inglés',
}

// Siglas de 2 letras, para tablas muy densas (ej. MapaDesempeno).
export const AREAS_SIGLA = {
  'Lectura Crítica': 'LC',
  Matemáticas: 'MT',
  'Sociales y Ciudadanas': 'CS',
  'Ciencias Naturales': 'NT',
  Inglés: 'IN',
}

// Peso en el puntaje global (ICFES): Lectura, Mate, Sociales y Ciencias = 3; Inglés = 1.
export const PESO_AREA = {
  'Lectura Crítica': 3,
  Matemáticas: 3,
  'Sociales y Ciudadanas': 3,
  'Ciencias Naturales': 3,
  Inglés: 1,
}

export const COMPETENCIAS = {
  'Lectura Crítica': [
    'Identificar y entender los contenidos locales de un texto',
    'Comprender la articulación de las partes de un texto',
    'Reflexionar y evaluar el contenido de un texto',
  ],
  Matemáticas: ['Interpretación y representación', 'Formulación y ejecución', 'Argumentación'],
  'Sociales y Ciudadanas': [
    'Pensamiento social',
    'Interpretación y análisis de perspectivas',
    'Pensamiento reflexivo y sistémico',
  ],
  'Ciencias Naturales': [
    'Uso comprensivo del conocimiento científico',
    'Explicación de fenómenos',
    'Indagación',
  ],
  Inglés: [],
}

// Reglas de palabras clave -> índice de competencia (dentro de COMPETENCIAS[area]).
const REGLAS = {
  'Lectura Crítica': [
    [/local|explícit|literal|identific|reconoce|párrafo|palabra|significado en el texto/i, 0],
    [/articul|estructura|relación entre|sentido global|organiza|cohes|conect|función/i, 1],
    [/reflex|evalú|valora|postura|crític|intención|punto de vista|contexto|ideológ|implíc/i, 2],
  ],
  Matemáticas: [
    [/interpret|represent|lee|extrae|gráfic|tabla|identifica información/i, 0],
    [/resuelve|calcula|ejecut|plantea|aplica|procedimiento|modelo/i, 1],
    [/argument|justific|valida|demuestra|razona|concluye|generaliza/i, 2],
  ],
  'Sociales y Ciudadanas': [
    [/context|conocimiento|ubica|reconoce|situación social|dimension/i, 0],
    [/perspectiv|interpreta|analiza|fuente|punto de vista|intereses|posición/i, 1],
    [/reflex|sistém|evalú|consecuenc|alternativ|modelo|propone/i, 2],
  ],
  'Ciencias Naturales': [
    [/uso comprensivo|aplica concept|reconoce|identifica|relaciona concept/i, 0],
    [/explica|fenómeno|causa|efecto|predice|modelo explicativo/i, 1],
    [/indag|experiment|hipótesis|variable|diseño|observ|dato|procedimiento/i, 2],
  ],
}

export function competenciaDeAprendizaje(area, aprendizaje) {
  const comps = COMPETENCIAS[area] || []
  if (!comps.length) return null
  const reglas = REGLAS[area] || []
  for (const [re, idx] of reglas) {
    if (re.test(aprendizaje || '')) return comps[idx]
  }
  return 'Otros aprendizajes'
}

// Bandas del puntaje global Saber 11 (0–500). Alineadas con la lectura del ICFES.
export const BANDAS_GLOBAL = [
  { min: 0, max: 250, nombre: 'Bajo', clase: 'alert' },
  { min: 250, max: 300, nombre: 'En progreso', clase: 'warn' },
  { min: 300, max: 360, nombre: 'Bueno', clase: 'ok' },
  { min: 360, max: 500, nombre: 'Excelente', clase: 'ok' },
]

export function bandaGlobal(puntaje) {
  if (puntaje == null) return null
  return BANDAS_GLOBAL.find((b) => puntaje >= b.min && puntaje < b.max) || BANDAS_GLOBAL[BANDAS_GLOBAL.length - 1]
}

// ---------------------------------------------------------------------
// Niveles de desempeño de Saber 11 (ICFES — piezas "Niveles de desempeño" de cada prueba).
// Los CORTES de puntaje (0-100) son distintos en cada prueba; los COLORES son los mismos en
// todas y salen de la escalera oficial del ICFES: 1 rojo, 2 naranja, 3 amarillo, 4 verde.
const ROJO = { fondo: '#f41e26', texto: '#ffffff' }
const NARANJA = { fondo: '#ff9b00', texto: '#20262e' }
const AMARILLO = { fondo: '#ffd500', texto: '#20262e' }
const VERDE = { fondo: '#00af43', texto: '#ffffff' }
// Inglés hasta 2025 tiene 5 niveles; el ICFES no publica un quinto color en estas piezas, así
// que B1 va en un verde intermedio y B+ en el verde oficial (decisión de diseño nuestra).
const VERDE_CLARO = { fondo: '#8cc63f', texto: '#20262e' }

const nivel = (etiqueta, desde, hasta, color) => ({ etiqueta, desde, hasta, ...color })

const NIVELES_POR_PRUEBA = {
  'Lectura Crítica': [
    nivel('Nivel 1', 0, 35, ROJO),
    nivel('Nivel 2', 36, 50, NARANJA),
    nivel('Nivel 3', 51, 65, AMARILLO),
    nivel('Nivel 4', 66, 100, VERDE),
  ],
  Matemáticas: [
    nivel('Nivel 1', 0, 35, ROJO),
    nivel('Nivel 2', 36, 50, NARANJA),
    nivel('Nivel 3', 51, 70, AMARILLO),
    nivel('Nivel 4', 71, 100, VERDE),
  ],
  'Sociales y Ciudadanas': [
    nivel('Nivel 1', 0, 40, ROJO),
    nivel('Nivel 2', 41, 55, NARANJA),
    nivel('Nivel 3', 56, 70, AMARILLO),
    nivel('Nivel 4', 71, 100, VERDE),
  ],
  'Ciencias Naturales': [
    nivel('Nivel 1', 0, 40, ROJO),
    nivel('Nivel 2', 41, 55, NARANJA),
    nivel('Nivel 3', 56, 70, AMARILLO),
    nivel('Nivel 4', 71, 100, VERDE),
  ],
}
const INGLES_HASTA_2025 = [
  nivel('A-', 0, 47, ROJO),
  nivel('A1', 48, 57, NARANJA),
  nivel('A2', 58, 67, AMARILLO),
  nivel('B1', 68, 78, VERDE_CLARO),
  nivel('B+', 79, 100, VERDE),
]
const INGLES_DESDE_2026 = [
  nivel('Pre A1', 0, 36, ROJO),
  nivel('A1', 37, 57, NARANJA),
  nivel('A2', 58, 70, AMARILLO),
  nivel('B1', 71, 100, VERDE),
]

/** Esquema de Inglés que rige para el año de la aplicación (cambió en 2026). */
export const INGLES_ESQUEMA_ANTERIOR = (anio) => !(anio != null && anio >= 2026)

/** Niveles ([{etiqueta, desde, hasta, fondo, texto}]) de una prueba de Saber 11 en un año. */
export function nivelesDePrueba(area, anio) {
  if (area === 'Inglés') return INGLES_ESQUEMA_ANTERIOR(anio) ? INGLES_HASTA_2025 : INGLES_DESDE_2026
  return NIVELES_POR_PRUEBA[area] || []
}
