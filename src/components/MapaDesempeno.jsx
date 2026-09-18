import { Link } from 'react-router-dom'
import { fmtNum } from '../lib/format.js'
import { AREAS_S11 } from '../lib/model.js'
import { AREAS_SIGLA as CORTO } from '../data/saber11.js'

// Bandas de desempeño por brecha vs Colombia (puntos, escala 0–100).
const BANDAS = [
  { nombre: 'Muy bajo', min: -Infinity, max: -12, bg: '#d1653c' },
  { nombre: 'Bajo', min: -12, max: -5, bg: '#d98f4a' },
  { nombre: 'Medio', min: -5, max: 5, bg: '#d9c14e' },
  { nombre: 'Alto', min: 5, max: 12, bg: '#6a9c96' },
  { nombre: 'Muy alto', min: 12, max: Infinity, bg: '#1e8a82' },
]
function banda(gap) {
  if (gap == null) return null
  return BANDAS.find((b) => gap >= b.min && gap < b.max)
}

/**
 * Mapa de desempeño: instituciones (filas) × áreas (columnas), color por
 * brecha vs Colombia. La institución `foco` va resaltada.
 */
export default function MapaDesempeno({ instituciones, foco }) {
  const filas = instituciones
    .filter((i) => i.tieneS11)
    .map((i) => ({
      inst: i,
      global: i.global,
      celdas: AREAS_S11.map((area) => {
        const a = i.areasS11?.find((x) => x.area === area)
        return { area, ee: a?.ee ?? null, gap: a?.gapCol ?? null }
      }),
    }))
    .sort((a, b) => (b.global ?? -1) - (a.global ?? -1))

  return (
    <div className="table-wrap">
      <table className="heat" style={{ borderSpacing: 2 }}>
        <thead>
          <tr>
            <th className="row-h">Institución</th>
            {AREAS_S11.map((a) => (
              <th key={a} title={a}>
                {CORTO[a]}
              </th>
            ))}
            <th>Global</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const esFoco = foco && f.inst.dane === foco.dane
            return (
              <tr key={f.inst.dane} style={esFoco ? { background: 'var(--accent-soft)' } : undefined}>
                <th
                  className="row-h"
                  style={{
                    maxWidth: 220,
                    fontWeight: esFoco ? 800 : 600,
                    color: 'var(--text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    padding: '2px 8px',
                  }}
                  title={f.inst.nombre}
                >
                  <Link to={`/instituciones/${f.inst.dane}`}>{f.inst.nombre}</Link>
                </th>
                {f.celdas.map((c) => {
                  const b = banda(c.gap)
                  return (
                    <td
                      key={c.area}
                      className={b ? '' : 'empty'}
                      style={b ? { background: b.bg } : undefined}
                      title={c.ee != null ? `${c.area}: ${fmtNum(c.ee, 1)} (${b?.nombre})` : 'Sin dato'}
                    >
                      {c.ee != null ? fmtNum(c.ee, 0) : '·'}
                    </td>
                  )
                })}
                <td
                  style={{
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontWeight: 700,
                  }}
                >
                  {f.global != null ? fmtNum(f.global) : '·'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="faint" style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        {BANDAS.map((b) => (
          <span key={b.nombre}>
            <span
              style={{ display: 'inline-block', width: 11, height: 11, borderRadius: 3, background: b.bg, marginRight: 5, verticalAlign: 'middle' }}
            />
            {b.nombre}
          </span>
        ))}
        <span>· color por brecha vs Colombia</span>
      </div>
      <div className="faint" style={{ marginTop: 6 }}>
        <strong>Convenciones:</strong> {AREAS_S11.map((a) => `${CORTO[a]} = ${a}`).join(' · ')} · Global = puntaje global (0–500)
      </div>
    </div>
  )
}
