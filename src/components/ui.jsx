import { fmtNum, pct } from '../lib/format.js'

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

/** Barra 1..4 de niveles de desempeño (array de fracciones 0..1). */
export function NivelesBar({ niveles }) {
  const vals = (niveles || []).map((v) => (v == null ? 0 : v))
  const total = vals.reduce((a, b) => a + b, 0) || 1
  return (
    <div className="niveles" title="Distribución por nivel de desempeño (1 a 4)">
      {vals.map((v, i) => {
        const w = (v / total) * 100
        return (
          <span key={i} className={'niv-' + (i + 1)} style={{ width: w + '%' }}>
            {w > 9 ? Math.round(v * 100) + '%' : ''}
          </span>
        )
      })}
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
