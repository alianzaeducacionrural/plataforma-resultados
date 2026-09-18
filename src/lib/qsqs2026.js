// QSQS 2026 — Aplicación 1 vs Aplicación 2, a tres niveles (competencia →
// afirmación → evidencia). Fuente: reportes "fase2_etc" de la SED, migrados a
// tres Sheets compactos (ver ARCHIVOS_QSQS2026 en Code.gs):
//   resultados: { DANE, ID, A1, A2 }  — enteros = % × 10.000, vacío = no evaluada
//   dic:        { ID, NIVEL (C/A/E), ID_PADRE, GRADO, AREA, TEXTO }
//   ref:        { ID, ETC1, ETC2, REG1, REG2, COL1, COL2 } — iguales para todas las instituciones
//
// Todo % acá es de ACIERTO (más alto = mejor), como el resto de QSQS.

import { num } from './format.js'

export const GRADOS_Q26 = ['3', '5', '7', '9']
export const AREAS_Q26 = ['Lenguaje', 'Matemáticas']

/** Rangos de desempeño de QSQS (los mismos que usan los reportes de la SED). */
export const RANGOS_QSQS = [
  { nombre: 'Muy bajo', hasta: 0.21, color: '#d1653c', texto: 'menos de 21 %' },
  { nombre: 'Bajo', hasta: 0.4, color: '#d99a4e', texto: '21 % a 39 %' },
  { nombre: 'Medio', hasta: 0.7, color: '#6a9c96', texto: '40 % a 69 %' },
  { nombre: 'Alto', hasta: Infinity, color: '#1e8a82', texto: '70 % o más' },
]

/** 0..1 -> rango de desempeño ({nombre, color, ...}) o null si no hay dato. */
export function rangoQsqs(v) {
  if (v == null || !Number.isFinite(v)) return null
  return RANGOS_QSQS.find((r) => v < r.hasta) || RANGOS_QSQS[RANGOS_QSQS.length - 1]
}

const media = (arr) => {
  const v = arr.filter((x) => x != null && Number.isFinite(x))
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

const enFraccion = (x) => {
  const n = num(x)
  return n == null ? null : n / 10000
}

/** Filas crudas {DANE, ID, A1, A2} -> [{ id, a1, a2 }] con % como fracción 0..1 (null = no evaluada). */
export function filasQsqs2026(resultados) {
  return (resultados ?? []).map((r) => ({ id: Number(r.ID), a1: enFraccion(r.A1), a2: enFraccion(r.A2) }))
}

/**
 * Respuesta cruda de `vista=qsqs2026` -> estructuras indexadas.
 * Devuelve null si no hay diccionario (backend sin la vista, o Sheet vacío).
 */
export function parseQsqs2026(q) {
  if (!q?.dic?.length) return null
  const fr = enFraccion
  const dic = new Map()
  const compIdsPorGrado = new Map()
  for (const d of q.dic) {
    const id = Number(d.ID)
    const nodo = {
      id,
      nivel: d.NIVEL,
      padre: d.ID_PADRE === '' || d.ID_PADRE == null ? null : Number(d.ID_PADRE),
      grado: String(d.GRADO),
      area: d.AREA,
      texto: d.TEXTO,
    }
    dic.set(id, nodo)
    if (nodo.nivel === 'C') {
      if (!compIdsPorGrado.has(nodo.grado)) compIdsPorGrado.set(nodo.grado, [])
      compIdsPorGrado.get(nodo.grado).push(id)
    }
  }
  const ref = new Map()
  for (const r of q.ref ?? []) {
    ref.set(Number(r.ID), {
      etc1: fr(r.ETC1),
      etc2: fr(r.ETC2),
      reg1: fr(r.REG1),
      reg2: fr(r.REG2),
      col1: fr(r.COL1),
      col2: fr(r.COL2),
    })
  }
  const porDane = new Map()
  for (const r of q.resultados ?? []) {
    const k = String(r.DANE)
    if (!porDane.has(k)) porDane.set(k, [])
    porDane.get(k).push({ id: Number(r.ID), a1: fr(r.A1), a2: fr(r.A2) })
  }
  return { dic, ref, compIdsPorGrado, porDane }
}

/**
 * Árbol competencia → afirmación → evidencia de UNA institución.
 * `filas`: [{id, a1, a2}] de esa institución (competencias y, si ya se cargó, el detalle).
 *
 * Si TODAS las competencias de un grado valen 0 en una aplicación, se interpreta que la
 * institución no participó / no tiene resultado ahí (un 0 % en cada competencia del grado
 * no es un desempeño real) y se deja sin dato en los tres niveles, para no mostrar un
 * "Muy bajo" falso ni arrastrar los promedios.
 */
export function arbolQsqs26(q26, filas) {
  const por = new Map(filas.map((f) => [f.id, f]))
  const sinAplicacion = {}
  for (const g of GRADOS_Q26) {
    const fs = (q26.compIdsPorGrado.get(g) ?? []).map((id) => por.get(id)).filter(Boolean)
    sinAplicacion[g] = {
      a1: fs.length > 0 && fs.every((f) => f.a1 === 0),
      a2: fs.length > 0 && fs.every((f) => f.a2 === 0),
    }
  }

  const nodos = new Map()
  for (const f of filas) {
    const d = q26.dic.get(f.id)
    if (!d) continue
    const ref = q26.ref.get(f.id) || {}
    const a1 = sinAplicacion[d.grado]?.a1 ? null : f.a1
    const a2 = sinAplicacion[d.grado]?.a2 ? null : f.a2
    nodos.set(f.id, {
      id: f.id,
      nivel: d.nivel,
      grado: d.grado,
      area: d.area,
      texto: d.texto,
      a1,
      a2,
      delta: a1 != null && a2 != null ? a2 - a1 : null,
      rango: rangoQsqs(a2),
      rango1: rangoQsqs(a1),
      ref,
      gapCol: a2 != null && ref.col2 != null ? a2 - ref.col2 : null,
      gapEtc: a2 != null && ref.etc2 != null ? a2 - ref.etc2 : null,
      hijos: [],
    })
  }
  for (const n of nodos.values()) {
    const p = q26.dic.get(n.id)?.padre
    if (p != null && nodos.has(p)) nodos.get(p).hijos.push(n)
  }
  const orden = (a, b) => a.id - b.id
  for (const n of nodos.values()) n.hijos.sort(orden)
  const competencias = [...nodos.values()]
    .filter((n) => n.nivel === 'C')
    .sort(
      (a, b) =>
        Number(a.grado) - Number(b.grado) || AREAS_Q26.indexOf(a.area) - AREAS_Q26.indexOf(b.area) || orden(a, b),
    )
  return { competencias, sinAplicacion }
}

/**
 * Resultado QSQS de UNA institución en las dos aplicaciones (para el listado): promedio de
 * sus competencias (todas, o solo las de `area`), cambio y rango de la Aplicación 2.
 * Si tiene datos en ambas aplicaciones, promedia solo las competencias evaluadas en las dos
 * (así el cambio compara lo mismo con lo mismo); si solo tiene una, muestra esa.
 * `grados` = cuántos grados (3°/5°/7°/9°) tienen resultado. Devuelve null si no hay resultados 2026.
 */
export function resumenQsqsInstitucion(inst, area = null) {
  const cs = (inst.q26?.competencias ?? []).filter((c) => !area || c.area === area)
  const pares = cs.filter((c) => c.a1 != null && c.a2 != null)
  const base = pares.length ? pares : cs
  const a1 = media(base.map((c) => c.a1))
  const a2 = media(base.map((c) => c.a2))
  if (a1 == null && a2 == null) return null
  const grados = new Set(cs.filter((c) => c.a1 != null || c.a2 != null).map((c) => c.grado)).size
  return {
    a1,
    a2,
    cambio: a1 != null && a2 != null ? a2 - a1 : null,
    rango: rangoQsqs(a2 ?? a1),
    enA2: a2 != null,
    grados,
  }
}

// ---------------------------------------------------------------------
// Agregados departamentales (sobre una lista de instituciones ya filtrada).
// Los niveles (a1, a2) son promedios de las instituciones con dato en CADA aplicación;
// "cambio" = a2 − a1 de esos promedios.

/** Evolución por área y grado (para el Panorama). */
export function evolucionAreasQsqs(lista) {
  return AREAS_Q26.map((area) => ({
    area,
    grados: GRADOS_Q26.map((grado) => {
      const a1 = []
      const a2 = []
      let ref = null
      for (const inst of lista) {
        const cs = (inst.q26?.competencias ?? []).filter((c) => c.area === area && c.grado === grado)
        if (!cs.length) continue
        const p1 = media(cs.map((c) => c.a1))
        const p2 = media(cs.map((c) => c.a2))
        if (p1 != null) a1.push(p1)
        if (p2 != null) a2.push(p2)
        if (!ref) {
          ref = {
            col1: media(cs.map((c) => c.ref.col1)),
            col2: media(cs.map((c) => c.ref.col2)),
            etc1: media(cs.map((c) => c.ref.etc1)),
            etc2: media(cs.map((c) => c.ref.etc2)),
          }
        }
      }
      const m1 = media(a1)
      const m2 = media(a2)
      return {
        grado,
        n1: a1.length,
        n2: a2.length,
        a1: m1,
        a2: m2,
        cambio: m1 != null && m2 != null ? m2 - m1 : null,
        ...(ref || { col1: null, col2: null, etc1: null, etc2: null }),
      }
    }),
  }))
}

const conteoVacio = () => Object.fromEntries(RANGOS_QSQS.map((r) => [r.nombre, 0]))

/**
 * Competencias agregadas sobre las instituciones: promedio de cada aplicación, cambio,
 * referencias y cuántas instituciones caen en cada rango. Una fila por competencia
 * (16 en total: 4 grados × [1 de Lenguaje + 3 de Matemáticas]).
 */
export function competenciasEvolucionQsqs(lista, { area = null, grado = null } = {}) {
  const by = new Map()
  for (const inst of lista) {
    for (const c of inst.q26?.competencias ?? []) {
      if (area && c.area !== area) continue
      if (grado && c.grado !== grado) continue
      if (!by.has(c.id)) {
        by.set(c.id, {
          id: c.id,
          grado: c.grado,
          area: c.area,
          competencia: c.texto,
          ref: c.ref,
          a1: [],
          a2: [],
          dist1: conteoVacio(),
          dist2: conteoVacio(),
        })
      }
      const o = by.get(c.id)
      if (c.a1 != null) {
        o.a1.push(c.a1)
        o.dist1[c.rango1.nombre]++
      }
      if (c.a2 != null) {
        o.a2.push(c.a2)
        o.dist2[c.rango.nombre]++
      }
    }
  }
  return [...by.values()]
    .map((o) => {
      const m1 = media(o.a1)
      const m2 = media(o.a2)
      return {
        id: o.id,
        grado: o.grado,
        area: o.area,
        competencia: o.competencia,
        ref: o.ref,
        n1: o.a1.length,
        n2: o.a2.length,
        a1: m1,
        a2: m2,
        cambio: m1 != null && m2 != null ? m2 - m1 : null,
        gap: m2 != null && o.ref.col2 != null ? m2 - o.ref.col2 : null,
        dist1: o.dist1,
        dist2: o.dist2,
      }
    })
    .sort(
      (a, b) =>
        Number(a.grado) - Number(b.grado) || AREAS_Q26.indexOf(a.area) - AREAS_Q26.indexOf(b.area) || a.id - b.id,
    )
}
