// Exportables sin dependencias: CSV (abre bien en Excel) y "PDF" vía el
// diálogo de impresión del navegador (window.print + una hoja de estilos
// @media print). No hace falta ninguna librería para ninguno de los dos.

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
    'Participación QSQS (%)',
    'Pruebas por debajo de Colombia',
  ]
  const filas = instituciones.map((d) => [
    d.dane,
    d.nombre,
    d.municipio,
    d.zona,
    d.sector,
    d.global ?? '',
    d.banda?.nombre ?? '',
    d.gapGlobalCol != null ? d.gapGlobalCol.toFixed(1) : '',
    d.participacionQsqs != null ? (d.participacionQsqs * 100).toFixed(1) : '',
    d.areasPrioritarias?.join(' | ') ?? '',
  ])
  return { cols, filas }
}

/** Dispara el diálogo de impresión (el usuario elige "Guardar como PDF"). */
export function imprimir() {
  window.print()
}
