// Exportables sin dependencias: CSV (abre bien en Excel) y "PDF" vía el
// diálogo de impresión del navegador (window.print + una hoja de estilos
// @media print). No hace falta ninguna librería para ninguno de los dos.

import { AREAS, nivelesDePrueba } from '../data/saber11.js'

function descargar(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Número con coma decimal (el CSV va con ";" y así lo entiende Excel en español). */
const dec = (v, d = 1) =>
  v == null || !Number.isFinite(v) ? '' : v.toFixed(d).replace(/\.0+$/, '').replace('.', ',')
/** Fracción 0..1 -> porcentaje con coma decimal ("38,3"). */
const porc = (v) => (v == null || !Number.isFinite(v) ? '' : dec(v * 100, 1))

function celda(v) {
  if (v == null) return ''
  const s = String(v).replace(/"/g, '""')
  return /[;"\n]/.test(s) ? `"${s}"` : s
}

/**
 * @param {string} nombreArchivo  sin extensión
 * @param {string[]} columnas
 * @param {Array<Array<string|number>>} filas
 */
export function exportarCsv(nombreArchivo, columnas, filas) {
  const lineas = [columnas.map(celda).join(';'), ...filas.map((f) => f.map(celda).join(';'))]
  // BOM para que Excel detecte UTF-8 correctamente.
  descargar(nombreArchivo + '.csv', '﻿' + lineas.join('\r\n'), 'text/csv;charset=utf-8')
}

/** Filas del listado de instituciones, listas para exportar. */
export function filasInstitucionesCsv(instituciones) {
  const cols = [
    'DANE',
    'Institución',
    'Municipio',
    'Zona',
    'Sector',
    'Puntaje global Saber 11',
    'Banda',
    'Diferencia vs Colombia (pts)',
    'Pruebas por debajo de Colombia',
  ]
  const filas = instituciones.map((d) => [
    d.dane,
    d.nombre,
    d.municipio,
    d.zona,
    d.sector,
    dec(d.global),
    d.banda?.nombre ?? '',
    dec(d.gapGlobalCol),
    d.areasPrioritarias?.join(' | ') ?? '',
  ])
  return { cols, filas }
}

/** Listado de instituciones en la pestaña QSQS: Aplicación 1, Aplicación 2, cambio y rango. */
export function filasInstitucionesQsqsCsv(instituciones) {
  const cols = [
    'DANE',
    'Institución',
    'Municipio',
    'Zona',
    'Sector',
    'Aplicación 1 (%)',
    'Aplicación 2 (%)',
    'Cambio (puntos porcentuales)',
    'Rango (Aplicación 2)',
    'Participación (%)',
  ]
  const filas = instituciones.map((d) => [
    d.dane,
    d.nombre,
    d.municipio,
    d.zona,
    d.sector,
    porc(d.q?.a1),
    porc(d.q?.a2),
    porc(d.q?.cambio),
    d.q?.rango?.nombre ?? '',
    porc(d.participacionQsqs),
  ])
  return { cols, filas }
}

const base = (d) => [d.dane, d.nombre, d.municipio, d.zona, d.sector]
const COLS_BASE = ['DANE', 'Institución', 'Municipio', 'Zona', 'Sector']

/**
 * Resultados y clasificación de Saber 11 por año (el equivalente en la plataforma del Excel
 * "Resultados y Clasificación Saber 11 2023-2025A" de la SED): una fila por institución con el
 * puntaje global, la clasificación de planteles y el puntaje de cada prueba en cada año, y al
 * final las referencias (Colombia y Caldas).
 */
export function filasHistoricoSaber11(instituciones, historicoRef) {
  const anios = [...new Set(instituciones.flatMap((d) => d.historico?.anios ?? []))].sort()
  const cols = [
    ...COLS_BASE,
    'Escuela Normal',
    ...anios.map((a) => `Puntaje global ${a}`),
    ...anios.map((a) => `Clasificación ${a}`),
    ...AREAS.flatMap((area) => anios.map((a) => `${area} ${a}`)),
  ]
  const filas = instituciones
    .filter((d) => d.historico?.anios?.length)
    .map((d) => [
      ...base(d),
      d.esNormal ? 'Sí' : '',
      ...anios.map((a) => dec(d.historico.global[a])),
      ...anios.map((a) => d.historico.clasificacion[a] ?? ''),
      ...AREAS.flatMap((area) => anios.map((a) => dec(d.historico.areas[area]?.[a]))),
    ])
  const referencia = (nombre, ref) => [
    '',
    `Referencia — ${nombre}`,
    '',
    '',
    '',
    '',
    ...anios.map((a) => dec(ref?.Global?.[a])),
    ...anios.map(() => ''),
    ...AREAS.flatMap((area) => anios.map((a) => dec(ref?.[area]?.[a]))),
  ]
  filas.push(referencia('Colombia', historicoRef?.colombia), referencia('Caldas (ETC)', historicoRef?.departamento))
  return { cols, filas }
}

/** Saber 11 del último año: una fila por institución y prueba, con promedio, referencias y niveles de desempeño. */
export function filasNivelesSaber11(instituciones) {
  const cols = [
    ...COLS_BASE,
    'Año',
    'Prueba',
    'Promedio',
    'Promedio Colombia',
    'Promedio Caldas (ETC)',
    'Diferencia vs Colombia',
    'Nivel 1 (%)',
    'Nivel 2 (%)',
    'Nivel 3 (%)',
    'Nivel 4 (%)',
    'Nivel 5 (%) (solo Inglés hasta 2025)',
    'Niveles y cortes de puntaje',
  ]
  const filas = []
  for (const d of instituciones) {
    for (const a of d.s11?.areas ?? []) {
      const cortes = nivelesDePrueba(a.area, d.s11.anio)
      filas.push([
        ...base(d),
        d.s11.anio ?? '',
        a.area,
        dec(a.ee),
        dec(a.ref?.Colombia),
        dec(a.ref?.ETC),
        a.ee != null && a.ref?.Colombia != null ? dec(a.ee - a.ref.Colombia) : '',
        ...[0, 1, 2, 3, 4].map((i) => porc(a.niveles?.[i])),
        cortes.map((n) => `${n.etiqueta}: ${n.desde}-${n.hasta}`).join(' | '),
      ])
    }
  }
  return { cols, filas }
}

/** QSQS 2026 por competencia: una fila por institución y competencia, con las dos aplicaciones y las referencias. */
export function filasCompetenciasQsqs(instituciones) {
  const cols = [
    ...COLS_BASE,
    'Grado',
    'Área',
    'Competencia',
    'Aplicación 1 (%)',
    'Aplicación 2 (%)',
    'Cambio (puntos porcentuales)',
    'Rango (Aplicación 2)',
    'Colombia Aplicación 2 (%)',
    'Caldas (ETC) Aplicación 2 (%)',
  ]
  const filas = []
  for (const d of instituciones) {
    for (const c of d.q26?.competencias ?? []) {
      if (c.a1 == null && c.a2 == null) continue // grado sin resultado en ninguna aplicación
      filas.push([
        ...base(d),
        c.grado,
        c.area,
        c.texto,
        porc(c.a1),
        porc(c.a2),
        porc(c.delta),
        c.rango?.nombre ?? '',
        porc(c.ref?.col2),
        porc(c.ref?.etc2),
      ])
    }
  }
  return { cols, filas }
}

/** Dispara el diálogo de impresión (el usuario elige "Guardar como PDF"). */
export function imprimir() {
  window.print()
}
