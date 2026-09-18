import { useNavigate } from 'react-router-dom'
import { fmtNum } from '../lib/format.js'
import { AREAS_CORTO as CORTO } from '../data/saber11.js'

// color por brecha (puntos vs Colombia, escala Saber 11 área 0–100)
function color(gap) {
  if (gap == null) return null
  const g = Math.max(-18, Math.min(6, gap))
  if (g >= 0) return '#12a05c'
  if (g >= -3) return '#5cc48a'
  if (g >= -6) return '#ffc233'
  if (g >= -10) return '#ff8a3d'
  return '#f0552d'
}

// sobre estos fondos claros el número va en oscuro (con blanco no se lee)
const FONDO_CLARO = new Set(['#ffc233', '#5cc48a'])

function etiquetaGap(gap) {
  const r = Math.round(gap)
  if (r === 0) return '0'
  return (r > 0 ? '+' : '−') + Math.abs(r)
}

export default function Heatmap({ filas, onCelda, termino = 'prueba', prueba = 'Saber 11' }) {
  const nav = useNavigate()
  if (!filas.length) return <p className="muted">Sin datos de {prueba} en el filtro actual.</p>
  const areas = filas[0].celdas.map((c) => c.area)

  return (
    <div className="table-wrap">
      <table className="heat">
        <thead>
          <tr>
            <th className="row-h">Municipio</th>
            {areas.map((a) => (
              <th key={a}>{CORTO[a] || a}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.municipio}>
              <th className="row-h">{f.municipio}</th>
              {f.celdas.map((c) => {
                const bg = color(c.gap)
                return (
                  <td
                    key={c.area}
                    className={bg ? '' : 'empty'}
                    style={bg ? { background: bg, color: FONDO_CLARO.has(bg) ? '#16262e' : undefined } : undefined}
                    title={
                      c.gap == null
                        ? 'Sin dato'
                        : `${f.municipio} · ${c.area}: ${c.gap >= 0 ? '+' : '−'}${fmtNum(Math.abs(c.gap), 1)} pts vs Colombia (${c.n} inst.)`
                    }
                    onClick={() => {
                      if (c.gap == null) return
                      if (onCelda) onCelda(f.municipio, c.area)
                      else nav(`/areas?area=${encodeURIComponent(c.area)}&municipio=${encodeURIComponent(f.municipio)}`)
                    }}
                  >
                    {c.gap == null ? '·' : etiquetaGap(c.gap)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="faint" style={{ marginTop: 8 }}>
        Cada celda: brecha promedio del municipio frente a Colombia, en puntos (0–100 por {termino}). Verde = a
        nivel o por encima · rojo = por debajo. Click para ver el detalle {termino === 'prueba' ? 'de la prueba' : 'del área'}.
      </p>
    </div>
  )
}
