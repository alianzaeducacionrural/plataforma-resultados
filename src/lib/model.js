// Construye el modelo normalizado a partir de la respuesta del backend
// ({ qsqs, saber11, meta }). Limpia tipos, unifica textos y arma:
//  - catálogo de instituciones (DANE -> ficha)
//  - por institución: Saber 11 (global, áreas, niveles, aprendizajes, competencias)
//    y QSQS (participación, afirmaciones -> competencias)
//  - agregados departamentales para el Panorama y el análisis por área

import { fold, frac, normSector, normZona, num, titleCase } from './format.js'
import {
  BANDAS_GLOBAL,
  bandaGlobal,
  competenciaDeAprendizaje,
  PESO_AREA,
} from '../data/saber11.js'

export const AREAS_S11 = [
  'Lectura Crítica',
  'Matemáticas',
  'Sociales y Ciudadanas',
  'Ciencias Naturales',
  'Inglés',
]
export const GRADOS_QSQS = ['3', '5', '7', '9']
export { BANDAS_GLOBAL, bandaGlobal }

const REF_KEYS = ['Colombia', 'ETC', 'Oficiales urbanos', 'Oficiales rurales', 'Privados']
export const REF_LABEL = {
  Colombia: 'Colombia',
  ETC: 'Caldas (ETC)',
  'Oficiales urbanos': 'Oficiales urbanos',
  'Oficiales rurales': 'Oficiales rurales',
  Privados: 'Privados',
  Municipio: 'su municipio',
  Departamento: 'el departamento',
}

// ---------- semáforo (brecha vs referencia) ----------
const CORTES = {
  global: { ok: -5, warn: -20 }, // 0–500
  area: { ok: -2, warn: -8 }, // 0–100
  frac: { ok: -0.03, warn: -0.1 }, // 0–1
}
export function semaforo(gap, tipo = 'area') {
  if (gap == null || !Number.isFinite(gap)) return 'na'
  const c = CORTES[tipo] || CORTES.area
  if (gap >= c.ok) return 'ok'
  if (gap >= c.warn) return 'warn'
  return 'alert'
}

// =====================================================================
export function buildModel(datos) {
  const qi = datos?.qsqs?.instituciones ?? []
  const qp = datos?.qsqs?.participacion ?? []
  const qa = datos?.qsqs?.resultados_afirmacion ?? []
  const si = datos?.saber11?.instituciones ?? []
  const sa = datos?.saber11?.resultados_area ?? []
  const sap = datos?.saber11?.aprendizajes ?? []
  const meta = datos?.meta ?? {}

  // ---------- diccionario QSQS: ID_AFIRMACION -> {area, competencia, texto} ----------
  const dicAfirm = new Map()
  for (const r of meta.qsqs_dic_afirmaciones ?? []) {
    dicAfirm.set(claveAfirm(r.GRADO, r.AREA, r.ID_AFIRMACION), {
      area: r.AREA,
      competencia: r.COMPETENCIA,
      texto: r['AFIRMACIÓN'] || r.AFIRMACION,
    })
  }
  // benchmark por competencia: clave grado|area|ID_COMPETENCIA -> {etc, region, colombia}
  const dicComp = new Map()
  for (const r of meta.qsqs_dic_competencias ?? []) {
    dicComp.set(String(r.ID_COMPETENCIA), { grado: r.GRADO, area: r.AREA, competencia: r.COMPETENCIA })
  }
  const benchComp = new Map()
  for (const r of meta.qsqs_benchmark_competencia ?? []) {
    const c = dicComp.get(String(r.ID_COMPETENCIA))
    if (!c) continue
    benchComp.set(fold(c.grado + '|' + c.area + '|' + c.competencia), {
      etc: frac(r['% ACIERTOS ETC']),
      region: frac(r['% ACIERTOS REGÍON']),
      colombia: frac(r['% ACIERTOS COLOMBIA']),
    })
  }

  // ---------- catálogo ----------
  const cat = new Map()
  const upsert = (dane, patch) => {
    const k = String(dane)
    cat.set(k, { ...(cat.get(k) || { dane: k }), ...patch })
  }
  for (const r of qi) {
    upsert(r.DANE, {
      nombre: r.EE,
      municipio: titleCase(r.Municipio),
      zona: normZona(r.Zona),
      sector: normSector(r.Sector),
    })
  }
  for (const r of si) {
    const prev = cat.get(String(r.DANE)) || {}
    upsert(r.DANE, {
      nombre: prev.nombre || r.EE,
      municipio: prev.municipio || titleCase(r.Municipio),
    })
  }
  // canonizar municipios (Chinchina/Chinchiná)
  const canonMun = new Map()
  for (const c of cat.values()) {
    if (!c.municipio) continue
    const key = fold(c.municipio)
    const cur = canonMun.get(key)
    if (!cur || diacriticos(c.municipio) > diacriticos(cur)) canonMun.set(key, c.municipio)
  }
  for (const c of cat.values()) {
    if (c.municipio) c.municipio = canonMun.get(fold(c.municipio)) || c.municipio
  }

  // ---------- Saber 11 por institución ----------
  const s11 = new Map()
  for (const r of si) {
    const ref = {}
    for (const key of REF_KEYS) {
      const col =
        key === 'Colombia' || key === 'ETC'
          ? `Puntaje Global ${key} - Promedio`
          : `Puntaje Global ${key} ETC - Promedio`
      ref[key] = num(r[col])
    }
    s11.set(String(r.DANE), {
      periodo: r['Periodo Aplicación'],
      matriculados: num(r['Matriculados EE']),
      inscritos: num(r['Inscritos EE']),
      presentes: num(r['Presentes EE']),
      conResultados: num(r['Con Resultados EE']),
      global: num(r['Puntaje Global EE - Promedio']),
      globalDesv: num(r['Puntaje Global EE - Desviación']),
      ref,
      areas: [],
      aprendizajes: [],
    })
  }
  for (const r of sa) {
    const o = s11.get(String(r.DANE))
    if (!o) continue
    const ref = {}
    for (const key of REF_KEYS) {
      ref[key] = num(
        r[key === 'Colombia' || key === 'ETC' ? `Promedio ${key}` : `Promedio ${key} ETC`],
      )
    }
    o.areas.push({
      area: r['Área'],
      ee: num(r['Promedio EE']),
      desv: num(r['Desviación EE']),
      niveles: [1, 2, 3, 4].map((n) => frac(r[`% Nivel ${n} EE`])),
      ref,
    })
  }
  for (const o of s11.values()) o.areas.sort((a, b) => AREAS_S11.indexOf(a.area) - AREAS_S11.indexOf(b.area))
  for (const r of sap) {
    const o = s11.get(String(r.DANE))
    if (!o) continue
    o.aprendizajes.push({
      area: r['Área'],
      competencia: competenciaDeAprendizaje(r['Área'], r['Aprendizaje']),
      aprendizaje: r['Aprendizaje'],
      ee: frac(r['% EE']),
      colombia: frac(r['% Colombia']),
      etc: frac(r['% ETC']),
    })
  }

  // ---------- QSQS por institución ----------
  const qsqs = new Map()
  const ensureQ = (k) => {
    if (!qsqs.has(k)) qsqs.set(k, { afirmaciones: [], porGrado: [], participacion: null })
    return qsqs.get(k)
  }
  const partBy = new Map()
  for (const r of qp) {
    const k = String(r.DANE)
    const rank = (num(r.ANIO) || 0) * 10 + (num(r.APLICACION) || 0)
    const prev = partBy.get(k)
    if (!prev || rank >= prev._rank) partBy.set(k, { ...r, _rank: rank })
  }
  for (const [k, r] of partBy) {
    const reg = num(r.estudiantes_registrados)
    const par = num(r.estudiantes_participantes)
    const o = ensureQ(k)
    o.anio = num(r.ANIO)
    o.aplicacion = num(r.APLICACION)
    o.registrados = reg
    o.participantes = par
    o.participacion = reg ? par / reg : null
    o.porGrado = GRADOS_QSQS.map((g) => {
      const rg = num(r[`estudiantes_registrados_${g}`])
      const pg = num(r[`estudiantes_participantes_${g}`])
      return { grado: g, registrados: rg, participantes: pg, participacion: rg ? pg / rg : null }
    })
  }
  for (const r of qa) {
    const k = String(r.DANE)
    const dic = dicAfirm.get(claveAfirm(r.GRADO, r.AREA, r.ID_AFIRMACION))
    ensureQ(k).afirmaciones.push({
      grado: String(r.GRADO || ''),
      area: r.AREA,
      competencia: dic?.competencia || null,
      idAfirmacion: r.ID_AFIRMACION,
      texto: dic?.texto || null,
      ee: frac(r['% ACIERTOS EE']),
      etc: frac(r['% ACIERTOS ETC']),
      region: frac(r['% ACIERTOS REGÍON']),
      colombia: frac(r['% ACIERTOS COLOMBIA']),
    })
  }

  // ---------- filas combinadas ----------
  const instituciones = [...cat.values()].map((c) => {
    const s = s11.get(c.dane) || null
    const q = qsqs.get(c.dane) || null
    const areasS11 = s
      ? s.areas.map((a) => {
          const gapETC = a.ee != null && a.ref.ETC != null ? a.ee - a.ref.ETC : null
          const gapCol = a.ee != null && a.ref.Colombia != null ? a.ee - a.ref.Colombia : null
          return { ...a, gapETC, gapCol, estado: semaforo(gapCol ?? gapETC, 'area') }
        })
      : []
    const prioritarias = areasS11.filter((a) => a.estado === 'alert').map((a) => a.area)
    const gapGlobalCol = s?.global != null && s?.ref?.Colombia != null ? s.global - s.ref.Colombia : null
    return {
      ...c,
      nombre: c.nombre || '(sin nombre)',
      municipio: c.municipio || '—',
      zona: c.zona || '',
      sector: c.sector || '',
      global: s?.global ?? null,
      banda: bandaGlobal(s?.global ?? null),
      gapGlobalCol,
      estadoGlobal: semaforo(gapGlobalCol, 'global'),
      participacionQsqs: q?.participacion ?? null,
      tieneS11: !!s,
      tieneQsqs: !!q,
      areasPrioritarias: prioritarias,
      areasS11,
      s11: s,
      qsqs: q,
    }
  })
  instituciones.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const municipios = [
    ...new Set(instituciones.map((i) => i.municipio).filter((m) => m && m !== '—')),
  ].sort((a, b) => a.localeCompare(b, 'es'))

  return {
    instituciones,
    municipios,
    periodo: firstDefined(instituciones.map((i) => i.s11?.periodo)),
    benchComp,
  }
}

// =====================================================================
// Agregados: recalculados sobre el subconjunto filtrado.

/** Resumen por área Saber 11 sobre una lista de instituciones. */
export function resumenAreasS11(lista) {
  return AREAS_S11.map((area) => {
    const vals = []
    const refs = []
    let bajoColombia = 0
    let conDato = 0
    for (const i of lista) {
      const a = i.areasS11?.find((x) => x.area === area)
      if (!a || a.ee == null) continue
      conDato++
      vals.push(a.ee)
      if (a.ref.Colombia != null) {
        refs.push(a.ref.Colombia)
        if (a.ee < a.ref.Colombia) bajoColombia++
      }
    }
    const prom = media(vals)
    const promRef = media(refs)
    const gap = prom != null && promRef != null ? prom - promRef : null
    return { area, prom, promRef, gap, bajoColombia, conDato, peso: PESO_AREA[area] || 1 }
  })
}

/** Aprendizajes Saber 11 más flojos del conjunto (promedio EE vs Colombia). */
export function aprendizajesFlojos(lista, { area = null, limite = 8 } = {}) {
  const by = new Map()
  for (const i of lista) {
    for (const ap of i.s11?.aprendizajes ?? []) {
      if (area && ap.area !== area) continue
      const key = ap.area + ' ‖ ' + ap.aprendizaje
      if (!by.has(key))
        by.set(key, { area: ap.area, competencia: ap.competencia, aprendizaje: ap.aprendizaje, ee: [], col: [] })
      const o = by.get(key)
      if (ap.ee != null) o.ee.push(ap.ee)
      if (ap.colombia != null) o.col.push(ap.colombia)
    }
  }
  return [...by.values()]
    .map((o) => {
      const ee = media(o.ee)
      const col = media(o.col)
      return { ...o, ee, col, gap: ee != null && col != null ? ee - col : null, n: o.ee.length }
    })
    .filter((o) => o.gap != null)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, limite)
}

/** Competencias QSQS agregadas de una institución (afirmaciones -> competencia). */
export function competenciasQsqs(inst) {
  const af = inst?.qsqs?.afirmaciones ?? []
  const by = new Map()
  for (const a of af) {
    const key = (a.grado || '?') + ' ‖ ' + (a.area || '?') + ' ‖ ' + (a.competencia || 'Sin clasificar')
    if (!by.has(key))
      by.set(key, {
        grado: a.grado,
        area: a.area,
        competencia: a.competencia || 'Sin clasificar',
        ee: [],
        etc: [],
        region: [],
        colombia: [],
        afirmaciones: [],
      })
    const o = by.get(key)
    ;['ee', 'etc', 'region', 'colombia'].forEach((k) => a[k] != null && o[k].push(a[k]))
    o.afirmaciones.push(a)
  }
  return [...by.values()]
    .map((o) => ({
      grado: o.grado,
      area: o.area,
      competencia: o.competencia,
      ee: media(o.ee),
      etc: media(o.etc),
      region: media(o.region),
      colombia: media(o.colombia),
      afirmaciones: o.afirmaciones.sort((a, b) => (a.ee ?? 1) - (b.ee ?? 1)),
    }))
    .sort(
      (a, b) =>
        a.area.localeCompare(b.area, 'es') ||
        a.grado.localeCompare(b.grado, 'es') ||
        a.competencia.localeCompare(b.competencia, 'es'),
    )
}

/** Matriz municipio × área (brecha promedio vs Colombia) para el heatmap. */
export function heatmapMunicipioArea(lista) {
  const muns = [...new Set(lista.map((i) => i.municipio).filter((m) => m && m !== '—'))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  )
  const filas = muns.map((mun) => {
    const enMun = lista.filter((i) => i.municipio === mun)
    const celdas = AREAS_S11.map((area) => {
      const gaps = []
      for (const i of enMun) {
        const a = i.areasS11?.find((x) => x.area === area)
        if (a && a.gapCol != null) gaps.push(a.gapCol)
      }
      return { area, gap: media(gaps), n: gaps.length }
    })
    return { municipio: mun, celdas }
  })
  return { muns, filas }
}

// ---------- helpers ----------
function claveAfirm(grado, area, id) {
  return fold(String(grado) + '|' + String(area) + '|' + String(id))
}
function firstDefined(arr) {
  return arr.find((x) => x != null) ?? null
}
function diacriticos(s) {
  return (String(s).normalize('NFD').match(/[̀-ͯ]/g) || []).length
}
export function media(arr) {
  const v = arr.filter((x) => x != null && Number.isFinite(x))
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}
export function promedio(list, pick) {
  return media(list.map(pick))
}
