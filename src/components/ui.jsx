import { fmtNum, pct } from '../lib/format.js'
import { RANGOS_QSQS } from '../lib/qsqs2026.js'
import { nivelesDePrueba } from '../data/saber11.js'

const LABEL = { ok: 'A nivel o por encima', warn: 'Levemente por debajo', alert: 'Por debajo', na: 'Sin dato' }

export function Semaforo({ estado, texto }) {
  return (
    <span className={'tag ' + estado}>
      <span className={'dot ' + estado} />
      {texto || LABEL[estado] || estado}
    </span>
  )
}

export function Dot({ estado }) {
  return <span className={'dot ' + (estado || 'na')} />
}

/** delta con signo y color. modo: 'pts' | 'pct' */
export function Delta({ valor, modo = 'pts', digits = 1 }) {
  if (valor == null || !Number.isFinite(valor)) return <span className="delta flat">—</span>
  const cls = Math.abs(valor) < (modo === 'pct' ? 0.005 : 0.05) ? 'flat' : valor > 0 ? 'up' : 'down'
  const signo = valor > 0 ? '+' : valor < 0 ? '−' : '±'
  const abs = modo === 'pct' ? pct(Math.abs(valor), digits) : fmtNum(Math.abs(valor), digits)
  return (
    <span className={'delta ' + cls}>
      {signo}
      {abs}
    </span>
  )
}

/** Etiqueta del rango de desempeño de QSQS (Muy bajo / Bajo / Medio / Alto). */
export function RangoTag({ rango }) {
  if (!rango) return <span className="faint">s/d</span>
  return (
    <span className="tag neutral" title={`${rango.nombre}: ${rango.texto}`}>
      <span className="dot" style={{ background: rango.color }} />
      {rango.nombre}
    </span>
  )
}

/** Barra apilada con cuántas instituciones cayeron en cada rango de QSQS. `dist`: {nombre: n}. */
export function BarraRangos({ dist }) {
  const total = RANGOS_QSQS.reduce((a, r) => a + (dist?.[r.nombre] ?? 0), 0)
  if (!total) return <span className="faint">s/d</span>
  const detalle = RANGOS_QSQS.map((r) => `${r.nombre}: ${dist[r.nombre] ?? 0}`).join(' · ')
  return (
    <div className="niveles" title={detalle}>
      {RANGOS_QSQS.map((r) => {
        const n = dist[r.nombre] ?? 0
        const w = (n / total) * 100
        return (
          <span key={r.nombre} style={{ width: w + '%', background: r.color }}>
            {w > 7 ? n : ''}
          </span>
        )
      })}
    </div>
  )
}

/** Leyenda de los cuatro rangos de QSQS con su umbral. */
export function LeyendaRangos() {
  return (
    <div className="faint" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8 }}>
      {RANGOS_QSQS.map((r) => (
        <span key={r.nombre}>
          <span className="dot" style={{ background: r.color, marginRight: 5 }} />
          <strong>{r.nombre}</strong> {r.texto}
        </span>
      ))}
    </div>
  )
}

/**
 * Barra de niveles de desempeño ICFES de una prueba de Saber 11 (fracciones 0..1). Los colores
 * son los oficiales del ICFES y el rango de puntaje de cada nivel depende de la prueba y del
 * año (ver nivelesDePrueba).
 */
export function NivelesBar({ niveles, area, anio }) {
  const cfg = nivelesDePrueba(area, anio)
  const vals = (niveles || []).map((v) => (v == null ? 0 : v))
  const total = vals.reduce((a, b) => a + b, 0) || 1
  return (
    <div className="niveles" title="Distribución de estudiantes por nivel de desempeño (pasá el cursor por cada tramo)">
      {vals.map((v, i) => {
        const c = cfg[i] || {}
        const w = (v / total) * 100
        return (
          <span
            key={i}
            title={`${c.etiqueta || 'Nivel ' + (i + 1)}${c.desde != null ? ` (${c.desde}–${c.hasta} pts)` : ''}: ${Math.round(v * 100)} %`}
            style={{ width: w + '%', background: c.fondo, color: c.texto }}
          >
            {w > 9 ? Math.round(v * 100) + '%' : ''}
          </span>
        )
      })}
    </div>
  )
}

/** Rangos de puntaje de cada nivel, por prueba (son distintos en cada una). */
export function LeyendaNiveles({ anio }) {
  const pruebas = ['Lectura Crítica', 'Matemáticas', 'Sociales y Ciudadanas', 'Ciencias Naturales', 'Inglés']
  const cols = Math.max(...pruebas.map((p) => nivelesDePrueba(p, anio).length))
  return (
    <div style={{ marginTop: 14 }}>
      <div className="faint" style={{ fontWeight: 700, marginBottom: 4 }}>
        Niveles de desempeño ICFES — rango de puntaje (0–100) de cada nivel, por prueba
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Prueba</th>
              {Array.from({ length: cols }, (_, i) => (
                <th key={i}>Nivel {i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pruebas.map((p) => {
              const ns = nivelesDePrueba(p, anio)
              return (
                <tr key={p}>
                  <td className="cell-strong">{p}</td>
                  {Array.from({ length: cols }, (_, i) => {
                    const n = ns[i]
                    return (
                      <td key={i}>
                        {n && (
                          <span className="nivel-chip" style={{ background: n.fondo, color: n.texto }}>
                            {n.etiqueta.startsWith('Nivel') ? '' : n.etiqueta + ' · '}
                            {n.desde}–{n.hasta}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="faint" style={{ margin: '4px 0 0' }}>
        Inglés hasta 2025 se reporta en 5 niveles (A-, A1, A2, B1, B+); desde 2026 en 4 (Pre A1, A1, A2, B1). El
        nivel B+ se calcula como el resto hasta 100 % porque la fuente migrada no lo trae.
      </p>
    </div>
  )
}

/**
 * Selector grande y visible Saber 11 / QSQS. Las dos pruebas nunca se muestran
 * juntas en ninguna página — este es el control que separa una vista de otra,
 * por eso es más grande y con más contraste que el <Seg> genérico de filtros.
 */
export function PruebaToggle({ value, onChange, disabledQsqs = false }) {
  return (
    <div className="prueba-toggle">
      <button
        type="button"
        className={'s11' + (value === 'saber11' ? ' active' : '')}
        onClick={() => onChange('saber11')}
      >
        Saber 11
      </button>
      <button
        type="button"
        className={'qsqs' + (value === 'qsqs' ? ' active' : '')}
        disabled={disabledQsqs}
        title={disabledQsqs ? 'Todavía sin datos para esta vista' : undefined}
        onClick={() => onChange('qsqs')}
      >
        QSQS
      </button>
    </div>
  )
}

/** Control segmentado (ej. filtro Zona/Sector). */
export function Seg({ value, onChange, options }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function KpiRow({ items }) {
  return (
    <section className="kpis">
      {items.map((k) => (
        <div key={k.label} className={'kpi' + (k.tono ? ' ' + k.tono : '')}>
          <div className="kpi-label">{k.label}</div>
          <div className="kpi-value">
            {k.value}
            {k.unit && <span className="kpi-unit"> {k.unit}</span>}
          </div>
          {k.sub && <div className="kpi-sub">{k.sub}</div>}
        </div>
      ))}
    </section>
  )
}

/**
 * Fila-barra comparativa: valor EE + marca de referencia + delta.
 * mode: 'puntaje' (0..max) | 'porcentaje' (0..1)
 */
export function BarRow({ label, value, referencia = null, max, mode = 'puntaje', estado, refLabel = 'ref.', link }) {
  const isPct = mode === 'porcentaje'
  const top = max ?? (isPct ? 1 : 100)
  const v = value == null ? null : Math.max(0, Math.min(1, value / top))
  const r = referencia == null ? null : Math.max(0, Math.min(1, referencia / top))
  const cls = estado === 'alert' ? ' alert' : estado === 'warn' ? ' warn' : ''
  const delta = value != null && referencia != null ? value - referencia : null
  const fmt = (x) => (x == null ? '—' : isPct ? pct(x, 0) : fmtNum(x, 1))
  return (
    <div className="bar-row" title={referencia != null ? `${refLabel}: ${fmt(referencia)}` : undefined}>
      <span className="lbl">{link || label}</span>
      <div className="bar-track">
        {v != null && <div className={'bar-fill' + cls} style={{ width: v * 100 + '%' }} />}
        {r != null && <div className="bar-ref" style={{ left: r * 100 + '%' }} />}
      </div>
      <span className="bar-score">
        {fmt(value)}{' '}
        {delta != null && <Delta valor={isPct ? delta : delta} modo={isPct ? 'pct' : 'pts'} />}
      </span>
    </div>
  )
}
