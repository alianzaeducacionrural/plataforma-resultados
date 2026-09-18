// Construye el modelo normalizado a partir de la respuesta del backend
// ({ qsqs, saber11, meta }). Limpia tipos, unifica textos y arma:
//  - catálogo de instituciones (DANE -> ficha)
//  - por institución: Saber 11 (global, áreas, niveles, aprendizajes, competencias)
//    y QSQS (participación, afirmaciones -> competencias)
//  - agregados departamentales para el Panorama y el análisis por área

import { fold, frac, normSector, normZona, num, titleCase } from './format.js'
import {
  AREAS,
  BANDAS_GLOBAL,
  bandaGlobal,
  competenciaDeAprendizaje,
  INGLES_ESQUEMA_ANTERIOR,
  PESO_AREA,
} from '../data/saber11.js'
import { arbolQsqs26, competenciasEvolucionQsqs, parseQsqs2026 } from './qsqs2026.js'

export {
  AREAS_Q26,
  GRADOS_Q26,
  RANGOS_QSQS,
  arbolQsqs26,
  competenciasEvolucionQsqs,
  evolucionAreasQsqs,
  rangoQsqs,
  resumenQsqsInstitucion,
} from './qsqs2026.js'

// Las 5 áreas de Saber 11, en orden canónico — la fuente única es data/saber11.js;
// se reexporta acá con este nombre porque el resto de la app ya lo conoce así.
export const AREAS_S11 = AREAS
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
  // QSQS 2026 (Aplicación 1 vs 2): llega aparte y en segundo plano — puede no estar todavía.
  const q26g = parseQsqs2026(datos?.qsqs2026)

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

  // benchmark por evidencia: ID_EVIDENCIA -> {etc, region, colombia}
  const benchEvid = new Map()
  for (const r of meta.qsqs_benchmark_evidencia ?? []) {
    benchEvid.set(String(r.ID_EVIDENCIA), {
      etc: frac(r['% ACIERTOS ETC']),
      region: frac(r['% ACIERTOS REGÍON']),
      colombia: frac(r['% ACIERTOS COLOMBIA']),
    })
  }
  // diccionario de evidencias: grado|area|texto de la afirmación -> [{idEvidencia, texto, bench}]
  // OJO: qsqs_dic_evidencias no trae ID_AFIRMACION, solo el texto de la afirmación —
  // por eso se cruza por texto (mismo criterio que ya usa esa hoja), no por ID.
  const evidPorAfirmacion = new Map()
  for (const r of meta.qsqs_dic_evidencias ?? []) {
    const key = fold(String(r.GRADO) + '|' + r.AREA + '|' + (r['AFIRMACIÓN'] || r.AFIRMACION || ''))
    if (!evidPorAfirmacion.has(key)) evidPorAfirmacion.set(key, [])
    evidPorAfirmacion.get(key).push({
      idEvidencia: r.ID_EVIDENCIA,
      texto: r.EVIDENCIA,
      bench: benchEvid.get(String(r.ID_EVIDENCIA)) || null,
    })
  }

  // ---------- histórico Saber 11 (2023-2025) ----------
  // Formato compacto de saber11_historico: DANE, MAT (código de 2 letras + G para
  // el global), ANIO (2 dígitos), PUNTAJE, CAT (A+/A/B/C/D, solo en filas MAT=G).
  const MAT_AREA = {
    LC: 'Lectura Crítica',
    MT: 'Matemáticas',
    SC: 'Sociales y Ciudadanas',
    CN: 'Ciencias Naturales',
    IN: 'Inglés',
  }
  const MATERIA_KEY = {
    [fold('Lectura crítica')]: 'Lectura Crítica',
    [fold('Matemáticas')]: 'Matemáticas',
    [fold('Sociales y ciudadanas')]: 'Sociales y Ciudadanas',
    [fold('Ciencias naturales')]: 'Ciencias Naturales',
    [fold('Inglés')]: 'Inglés',
    [fold('PROMEDIO GLOBAL')]: 'Global',
    [fold('PUNTAJE GLOBAL')]: 'Global',
  }
  const anioCompleto = (v) => {
    const n = num(v)
    if (n == null) return null
    return n < 100 ? 2000 + n : n
  }

  const histRows = datos?.historico?.historico ?? []
  const historicoPorDane = new Map()
  for (const r of histRows) {
    const dane = String(r.DANE || '')
    if (!dane) continue
    if (!historicoPorDane.has(dane))
      historicoPorDane.set(dane, { anios: new Set(), global: {}, clasificacion: {}, areas: {} })
    const h = historicoPorDane.get(dane)
    const anio = anioCompleto(r.ANIO)
    if (anio == null) continue
    h.anios.add(anio)
    const puntaje = num(r.PUNTAJE)
    if (r.MAT === 'G') {
      if (puntaje != null) h.global[anio] = puntaje
      if (r.CAT) h.clasificacion[anio] = String(r.CAT).trim()
    } else {
      const area = MAT_AREA[r.MAT]
      if (!area || puntaje == null) continue
      if (!h.areas[area]) h.areas[area] = {}
      h.areas[area][anio] = puntaje
    }
  }
  const normalesSet = new Set((datos?.historico?.normales ?? []).map((r) => String(r.DANE || '')))

  // referencias por año: {area: {anio: puntaje}}, y por grupo para zonas
  const refPorAnio = (filas) => {
    const m = {}
    for (const r of filas) {
      const area = MATERIA_KEY[fold(r.MATERIA || '')]
      const anio = anioCompleto(r.ANIO)
      const puntaje = num(r.PUNTAJE)
      if (!area || anio == null || puntaje == null) continue
      if (!m[area]) m[area] = {}
      m[area][anio] = puntaje
    }
    return m
  }
  const refColombiaHist = refPorAnio(datos?.historico?.ref_colombia ?? [])
  const refDepartamentoHist = refPorAnio(datos?.historico?.ref_departamento ?? [])
  const refZonasHist = {}
  for (const r of datos?.historico?.ref_zonas ?? []) {
    const grupo = r.GRUPO
    const area = MATERIA_KEY[fold(r.MATERIA || '')]
    const anio = anioCompleto(r.ANIO)
    const puntaje = num(r.PUNTAJE)
    if (!grupo || !area || anio == null || puntaje == null) continue
    if (!refZonasHist[grupo]) refZonasHist[grupo] = {}
    if (!refZonasHist[grupo][area]) refZonasHist[grupo][area] = {}
    refZonasHist[grupo][area][anio] = puntaje
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
      anio: anioDePeriodo(r['Periodo Aplicación']),
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
      niveles: nivelesCompletos(r['Área'], o.anio, [1, 2, 3, 4].map((n) => frac(r[`% Nivel ${n} EE`]))),
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
    // Las evidencias son solo de referencia (texto + % ETC/Región/Colombia): QSQS no
    // reporta el resultado de la institución a ese nivel, solo hasta afirmación.
    const evidencias = dic?.texto
      ? evidPorAfirmacion.get(fold(String(r.GRADO) + '|' + r.AREA + '|' + dic.texto)) || []
      : []
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
      evidencias,
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
    const hRaw = historicoPorDane.get(c.dane)
    const anios = hRaw ? [...hRaw.anios].sort() : []
    const historico = hRaw ? { anios, global: hRaw.global, clasificacion: hRaw.clasificacion, areas: hRaw.areas } : null
    const clasificacionActual = anios.length ? hRaw.clasificacion[anios[anios.length - 1]] || null : null
    const filasQ26 = q26g?.porDane.get(c.dane)
    let q26 = null
    if (filasQ26?.length) {
      const { competencias, sinAplicacion } = arbolQsqs26(
        q26g,
        filasQ26.filter((f) => q26g.dic.get(f.id)?.nivel === 'C'),
      )
      q26 = {
        filas: filasQ26,
        competencias,
        sinAplicacion,
        // ya vino el detalle (afirmaciones/evidencias) — pasa con el token de institución
        tieneDetalle: filasQ26.some((f) => q26g.dic.get(f.id)?.nivel !== 'C'),
      }
    }
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
      q26,
      historico,
      clasificacionActual,
      esNormal: normalesSet.has(c.dane),
    }
  })
  instituciones.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const municipios = [
    ...new Set(instituciones.map((i) => i.municipio).filter((m) => m && m !== '—')),
  ].sort((a, b) => a.localeCompare(b, 'es'))

  const aniosS11 = instituciones.map((i) => i.s11?.anio).filter((a) => a != null)
  const anioSaber11 = aniosS11.length ? Math.max(...aniosS11) : null

  return {
    instituciones,
    municipios,
    periodo: firstDefined(instituciones.map((i) => i.s11?.periodo)),
    anioSaber11,
    // referencias/diccionario de QSQS 2026 (compartidos por todas las instituciones)
    q26: q26g ? { dic: q26g.dic, ref: q26g.ref, compIdsPorGrado: q26g.compIdsPorGrado, disponible: q26g.porDane.size > 0 } : null,
    benchComp,
    historicoRef: { colombia: refColombiaHist, departamento: refDepartamentoHist, zonas: refZonasHist },
    documentos: meta.documentos ?? [],
  }
}

// =====================================================================
// Agregados: recalculados sobre el subconjunto filtrado.

/**
 * Puntaje global promedio por año (2023-2025) sobre un conjunto de
 * instituciones, para el gráfico departamental de Histórico.
 * Devuelve [{ anio, prom, n }], ordenado por año.
 */
export function historicoGlobalPromedio(lista) {
  const porAnio = new Map()
  for (const i of lista) {
    const h = i.historico
    if (!h) continue
    for (const anio of h.anios) {
      const v = h.global[anio]
      if (v == null) continue
      if (!porAnio.has(anio)) porAnio.set(anio, [])
      porAnio.get(anio).push(v)
    }
  }
  return [...porAnio.entries()]
    .map(([anio, vals]) => ({ anio, prom: media(vals), n: vals.length }))
    .sort((a, b) => a.anio - b.anio)
}

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

/**
 * Aprendizajes Saber 11 más flojos del conjunto (promedio EE vs Colombia).
 *
 * OJO: `ee`/`col` acá NO son % de acierto — son el "% promedio de estudiantes que
 * responde incorrectamente al aprendizaje" (así lo nombra el ICFES en la fuente). Por
 * eso el gap se calcula `col - ee` (positivo = la institución tiene MENOS error que
 * Colombia = bien), para mantener la misma convención "gap positivo = bien" que usa
 * el resto de la app (semaforo, <Delta>, etc.). Si se calculara `ee - col` como en el
 * resto de las métricas (que sí son de acierto/puntaje), quedaría invertido: un
 * aprendizaje con MÁS error que Colombia se vería en verde como fortaleza.
 */
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
      return { ...o, ee, col, gap: ee != null && col != null ? col - ee : null, n: o.ee.length }
    })
    .filter((o) => o.gap != null)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, limite)
}

/**
 * Competencias QSQS de una institución. Si ya llegó QSQS 2026 (Aplicación 1 vs 2), ese es el
 * resultado vigente y reemplaza al 2025 anterior — `ee` es el % de acierto de la Aplicación 2
 * y `ee1` el de la Aplicación 1. Sin 2026, cae al armado anterior (afirmaciones -> competencia).
 */
export function competenciasQsqs(inst) {
  const c26 = inst?.q26?.competencias
  if (c26?.length) {
    return c26.map((n) => ({
      id: n.id,
      grado: n.grado,
      area: n.area,
      competencia: n.texto,
      ee: n.a2,
      ee1: n.a1,
      delta: n.delta,
      rango: n.rango,
      etc: n.ref.etc2,
      region: n.ref.reg2,
      colombia: n.ref.col2,
      afirmaciones: [],
    }))
  }
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

// ---------- QSQS departamental (agregados sobre un conjunto de instituciones) ----------
// Área acá es Lenguaje/Matemáticas (QSQS), no las 5 áreas de Saber 11. A diferencia de
// los "aprendizajes" de Saber 11, el % de QSQS (afirmaciones/competencias) SÍ es %
// de acierto — gap = ee - colombia, "más alto = mejor" es la convención normal.
export const AREAS_QSQS = ['Lenguaje', 'Matemáticas']

function areasQsqsDeInstitucion(inst) {
  const comps = competenciasQsqs(inst)
  return AREAS_QSQS.map((area) => {
    const enArea = comps.filter((c) => c.area === area && c.ee != null && c.colombia != null)
    const ee = media(enArea.map((c) => c.ee))
    const colombia = media(enArea.map((c) => c.colombia))
    return { area, ee, colombia, gap: ee != null && colombia != null ? ee - colombia : null }
  })
}

/** Resumen por área QSQS (Lenguaje/Matemáticas) sobre una lista de instituciones. */
export function resumenAreasQsqs(lista) {
  return AREAS_QSQS.map((area) => {
    const vals = []
    const refs = []
    let bajoColombia = 0
    let conDato = 0
    for (const i of lista) {
      const a = areasQsqsDeInstitucion(i).find((x) => x.area === area)
      if (!a || a.ee == null) continue
      conDato++
      vals.push(a.ee)
      if (a.colombia != null) refs.push(a.colombia)
      if (a.gap != null && a.gap < 0) bajoColombia++
    }
    const prom = media(vals)
    const promRef = media(refs)
    const gap = prom != null && promRef != null ? prom - promRef : null
    return { area, prom, promRef, gap, bajoColombia, conDato }
  })
}

/** Competencias QSQS agregadas sobre un conjunto de instituciones (ranking departamental). */
export function resumenCompetenciasQsqs(lista, { area = null, limite = 200 } = {}) {
  if (lista.some((i) => i.q26)) {
    return competenciasEvolucionQsqs(lista, { area })
      .filter((o) => o.gap != null)
      .map((o) => ({ ...o, ee: o.a2, col: o.ref.col2, n: o.n2 }))
      .sort((a, b) => a.gap - b.gap)
      .slice(0, limite)
  }
  const by = new Map()
  for (const inst of lista) {
    for (const c of competenciasQsqs(inst)) {
      if (area && c.area !== area) continue
      if (c.ee == null || c.colombia == null) continue
      const key = c.grado + ' ‖ ' + c.area + ' ‖ ' + c.competencia
      if (!by.has(key)) by.set(key, { grado: c.grado, area: c.area, competencia: c.competencia, ee: [], colombia: [] })
      by.get(key).ee.push(c.ee)
      by.get(key).colombia.push(c.colombia)
    }
  }
  return [...by.values()]
    .map((o) => {
      const ee = media(o.ee)
      const col = media(o.colombia)
      return { ...o, ee, col, gap: ee != null && col != null ? ee - col : null, n: o.ee.length }
    })
    .filter((o) => o.gap != null)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, limite)
}

/** Matriz municipio × área QSQS (Lenguaje/Matemáticas), brecha promedio vs Colombia. */
export function heatmapMunicipioAreaQsqs(lista) {
  const muns = [...new Set(lista.map((i) => i.municipio).filter((m) => m && m !== '—'))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  )
  const filas = muns.map((mun) => {
    const enMun = lista.filter((i) => i.municipio === mun && i.tieneQsqs)
    const celdas = AREAS_QSQS.map((area) => {
      const gaps = []
      for (const i of enMun) {
        const a = areasQsqsDeInstitucion(i).find((x) => x.area === area)
        if (a && a.gap != null) gaps.push(a.gap)
      }
      // gap acá es una fracción (0..1); el Heatmap está pensado para puntos
      // (redondea al entero más cercano) — se pasa a puntos porcentuales para
      // que la escala de color y las etiquetas tengan sentido.
      const g = media(gaps)
      return { area, gap: g != null ? g * 100 : null, n: gaps.length }
    })
    return { municipio: mun, celdas }
  })
  return { muns, filas }
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
/**
 * Hasta 2025 Inglés tiene 5 niveles (A-, A1, A2, B1, B+) y la fuente migrada solo trae 4
 * columnas: B+ es lo que falta para llegar a 100 % (se tolera el redondeo del ICFES).
 * Sin datos (todo en 0, p. ej. "N.D.") no se inventa nada.
 */
function nivelesCompletos(area, anio, niv4) {
  if (area !== 'Inglés' || !INGLES_ESQUEMA_ANTERIOR(anio)) return niv4
  const suma = niv4.reduce((a, v) => a + (v ?? 0), 0)
  return [...niv4, suma > 0 ? Math.max(0, 1 - suma) : 0]
}
function firstDefined(arr) {
  return arr.find((x) => x != null) ?? null
}
// "Periodo Aplicación" llega como fecha ISO ("2025-03-01T08:00:00.000Z") —
// de ahí sacamos solo el año, para poder mostrar "Puntaje 2025" en vez de
// un genérico "Puntaje Saber 11" que no dice a qué aplicación corresponde.
function anioDePeriodo(v) {
  if (!v) return null
  const m = String(v).match(/^(\d{4})/)
  return m ? Number(m[1]) : null
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
