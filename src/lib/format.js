// Helpers de parsing y formato. Los Sheets traen números como strings
// ("228.0"), porcentajes de varias formas ("26.24 %", 0.11) y mayúsculas
// inconsistentes en Municipio ("AGUADAS" vs "Aguadas").

/** "228.0" | 228 | "" | null -> number | null */
export function num(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const n = parseFloat(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Normaliza un porcentaje a fracción 0..1.
 * Acepta "26.24 %", "0.2624", 0.2624, 26.24 (con hint) .
 */
export function frac(v) {
  const n = num(v)
  if (n == null) return null
  if (typeof v === 'string' && v.includes('%')) return n / 100
  return n > 1.0001 ? n / 100 : n
}

/** number 0..1 -> "62 %" (decimal con coma) */
export function pct(f, digits = 0) {
  if (f == null || !Number.isFinite(f)) return '—'
  return (
    (f * 100).toLocaleString('es-CO', { minimumFractionDigits: digits, maximumFractionDigits: digits }) +
    ' %'
  )
}

/** "AGUADAS" | "villamaría" -> "Aguadas" | "Villamaría" */
export function titleCase(s) {
  if (!s) return ''
  return String(s)
    .toLowerCase()
    .replace(/(^|[\s(-])([\p{L}])/gu, (_, sep, ch) => sep + ch.toUpperCase())
}

/** "OFICIAL" | "NO OFICIAL" | "Privado" -> "Oficial" | "No oficial" */
export function normSector(s) {
  const t = String(s || '').trim().toUpperCase()
  if (!t) return ''
  if (t.startsWith('NO OFICIAL') || t === 'PRIVADO' || t === 'NO_OFICIAL') return 'No oficial'
  if (t === 'OFICIAL') return 'Oficial'
  return titleCase(s)
}

/** "URBANA" | "Rural" -> "Urbana" | "Rural" */
export function normZona(s) {
  const t = String(s || '').trim().toUpperCase()
  if (t.startsWith('URBAN')) return 'Urbana'
  if (t.startsWith('RURAL')) return 'Rural'
  return t ? titleCase(s) : ''
}

/** Quita tildes/diacríticos para comparar ("Chinchiná" ~ "Chinchina"). */
export function fold(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function fmtNum(n, digits = 0) {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toLocaleString('es-CO', { maximumFractionDigits: digits })
}
