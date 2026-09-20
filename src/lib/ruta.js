// Ruta de mejoramiento de QSQS, según la Guía Orientadora (QSQS-PFAP 2026):
//   Resultados → Análisis → Priorización → PFAP → Intervención → Seguimiento → Mejoramiento.
// La plataforma cubre los momentos que salen de los datos (resultados, análisis, priorización y
// seguimiento entre aplicaciones); PFAP, intervención y mejoramiento los hace la institución con la
// Caja de Herramientas. Reglas de la Guía que se aplican acá:
//  - el análisis parte de las evidencias en rango Muy bajo y Bajo;
//  - si VARIAS evidencias de una misma afirmación salen bajas, es una dificultad común y hay que
//    subir al análisis de la afirmación; si es una sola, es una dificultad puntual;
//  - las aplicaciones son acumulativas: se compara la Aplicación 1 con la 2 (y luego la 3).

import { RANGOS_QSQS, rangoQsqs } from './qsqs2026.js'
import { media } from './model.js'

const BAJOS = new Set(['Muy bajo', 'Bajo'])
/** Cambio (en fracción) a partir del cual se considera que una evidencia mejoró o empeoró. */
export const UMBRAL_CAMBIO = 0.05

export const esBajo = (v) => v != null && BAJOS.has(rangoQsqs(v)?.nombre)
/** Valor vigente de un nodo: el de la Aplicación 2 y, si no lo tiene, el de la 1. */
export const vigente = (n) => n.a2 ?? n.a1 ?? null

/** Cómo va un nodo (competencia, afirmación o evidencia) entre la Aplicación 1 y la 2. */
export function estadoSeguimiento(n) {
  if (n.a1 == null && n.a2 == null) return null
  if (n.a2 == null) return { clave: 'sin2', texto: 'Solo Aplicación 1', tono: 'neutral' }
  if (n.a1 == null) return { clave: 'sin1', texto: 'Solo Aplicación 2', tono: 'neutral' }
  const d = n.a2 - n.a1
  const bajo1 = esBajo(n.a1)
  const bajo2 = esBajo(n.a2)
  if (bajo1 && !bajo2) return { clave: 'supero', texto: 'Salió del rango bajo', tono: 'ok' }
  if (!bajo1 && bajo2) return { clave: 'nueva', texto: 'Nueva alerta', tono: 'alert' }
  if (bajo1 && bajo2) {
    if (d >= UMBRAL_CAMBIO) return { clave: 'mejora', texto: 'Mejora, sigue bajo', tono: 'ok' }
    if (d <= -UMBRAL_CAMBIO) return { clave: 'empeora', texto: 'Empeora', tono: 'alert' }
    return { clave: 'persiste', texto: 'Persiste', tono: 'warn' }
  }
  if (d >= UMBRAL_CAMBIO) return { clave: 'mejora', texto: 'Mejora', tono: 'ok' }
  if (d <= -UMBRAL_CAMBIO) return { clave: 'empeora', texto: 'Empeora', tono: 'alert' }
  return { clave: 'estable', texto: 'Estable', tono: 'neutral' }
}

const conteoVacio = () => Object.fromEntries(RANGOS_QSQS.map((r) => [r.nombre, 0]))

/**
 * Análisis de UNA institución a partir de su árbol competencia → afirmación → evidencia
 * (`arbolQsqs26(...).competencias`). Si todavía no llegó el detalle (`tieneDetalle` = false) solo se
 * pueden usar las competencias.
 */
export function analizarInstitucionQsqs(competencias) {
  const tieneDetalle = competencias.some((c) => c.hijos.length > 0 && c.hijos.some((a) => a.hijos.length > 0))
  const evidencias = conteoVacio()
  const comunes = []
  const puntuales = []
  const seg = { bajasA1: 0, superaron: 0, persisten: 0, nuevas: 0, comparables: 0 }

  for (const c of competencias) {
    for (const a of c.hijos) {
      const evs = a.hijos.filter((e) => vigente(e) != null)
      const bajas = evs.filter((e) => esBajo(vigente(e)))
      for (const e of evs) {
        evidencias[rangoQsqs(vigente(e)).nombre]++
        if (e.a1 != null && e.a2 != null) {
          seg.comparables++
          const b1 = esBajo(e.a1)
          const b2 = esBajo(e.a2)
          if (b1) seg.bajasA1++
          if (b1 && !b2) seg.superaron++
          if (b1 && b2) seg.persisten++
          if (!b1 && b2) seg.nuevas++
        }
      }
      if (bajas.length >= 2) comunes.push({ c, a, bajas, evaluadas: evs.length })
      else if (bajas.length === 1) puntuales.push({ c, a, e: bajas[0] })
    }
  }
  // más evidencias bajas primero; a igual número, la afirmación con menor resultado
  comunes.sort((x, y) => y.bajas.length - x.bajas.length || (vigente(x.a) ?? 1) - (vigente(y.a) ?? 1))
  puntuales.sort((x, y) => (vigente(x.e) ?? 1) - (vigente(y.e) ?? 1))

  const competenciasBajas = competencias
    .filter((c) => esBajo(vigente(c)))
    .sort((x, y) => (vigente(x) ?? 1) - (vigente(y) ?? 1))
  const totalEvidencias = Object.values(evidencias).reduce((s, n) => s + n, 0)
  const enRangoBajo = evidencias['Muy bajo'] + evidencias.Bajo
  return { tieneDetalle, evidencias, totalEvidencias, enRangoBajo, comunes, puntuales, competenciasBajas, seg }
}

const pctTxt = (v) => (v == null ? '' : (v * 100).toFixed(1).replace('.', ','))

/**
 * Filas del "Anexo A — Análisis de evidencias": lo que la Secretaría entrega (área, competencia,
 * afirmación, evidencia, % de acierto, % de error y rango) más la Aplicación 1, el cambio y si la
 * evidencia queda priorizada (Muy bajo o Bajo).
 */
export function filasAnexoA(competencias) {
  const cols = [
    'Grado',
    'Área',
    'Competencia',
    'Afirmación',
    'Evidencia',
    '% de acierto (Aplicación 2)',
    '% de error (Aplicación 2)',
    'Rango (Aplicación 2)',
    '% de acierto (Aplicación 1)',
    'Cambio (puntos porcentuales)',
    'Priorizada (Muy bajo o Bajo)',
  ]
  const filas = []
  for (const c of competencias) {
    for (const a of c.hijos) {
      for (const e of a.hijos) {
        if (e.a1 == null && e.a2 == null) continue
        const v = vigente(e)
        filas.push([
          c.grado,
          c.area,
          c.texto,
          a.texto,
          e.texto,
          pctTxt(e.a2),
          e.a2 != null ? pctTxt(1 - e.a2) : '',
          e.a2 != null ? (rangoQsqs(e.a2)?.nombre ?? '') : '',
          pctTxt(e.a1),
          e.a1 != null && e.a2 != null ? pctTxt(e.a2 - e.a1) : '',
          esBajo(v) ? 'Sí' : 'No',
        ])
      }
    }
  }
  return { cols, filas }
}

/**
 * Vista departamental: instituciones a acompañar primero en QSQS, según cuántas de sus competencias
 * están en rango Muy bajo o Bajo, y cuántas de ellas ya estaban así en la Aplicación 1 (persisten).
 * Solo usa competencias (es lo que se carga para todo el departamento).
 */
export function institucionesAAcompanarQsqs(lista, limite = 15) {
  const filas = []
  for (const inst of lista) {
    const cs = (inst.q26?.competencias ?? []).filter((c) => vigente(c) != null)
    if (!cs.length) continue
    const bajas = cs.filter((c) => esBajo(vigente(c)))
    if (!bajas.length) continue
    const persisten = bajas.filter((c) => c.a1 != null && c.a2 != null && esBajo(c.a1) && esBajo(c.a2)).length
    const deltas = cs.map((c) => c.delta).filter((d) => d != null)
    filas.push({
      inst,
      bajas: bajas.length,
      persisten,
      total: cs.length,
      prom: media(cs.map((c) => vigente(c))),
      cambio: deltas.length ? media(deltas) : null, // cambio promedio de la Aplicación 1 a la 2 (fracción)
    })
  }
  return filas
    .sort((x, y) => y.persisten - x.persisten || y.bajas - x.bajas || (x.prom ?? 1) - (y.prom ?? 1))
    .slice(0, limite)
}

/** Vista departamental: instituciones con más pruebas de Saber 11 por debajo de Colombia. */
export function institucionesAAcompanarSaber11(lista, limite = 15) {
  return lista
    .filter((d) => d.tieneS11 && (d.areasPrioritarias?.length ?? 0) > 0)
    .sort(
      (x, y) =>
        y.areasPrioritarias.length - x.areasPrioritarias.length || (x.gapGlobalCol ?? 0) - (y.gapGlobalCol ?? 0),
    )
    .slice(0, limite)
}
