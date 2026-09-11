import { Delta } from '../ui.jsx'
import { fmtNum } from '../../lib/format.js'

/**
 * Comparación por área estilo Geduka: por cada área una línea con dos puntos
 * (institución y referencia) y la diferencia.
 * filas: [{ area, ee, ref }]
 */
export default function DotPlotAreas({ filas, etiquetaRef = 'referencia', min = 20, max = 80 }) {
  const escala = (v) => ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="bar-row" style={{ gridTemplateColumns: '150px 1fr 120px', fontSize: 11 }}>
        <span />
        <div style={{ display: 'flex', justifyContent: 'space-between' }} className="faint">
          <span>{min}</span>
          <span>{Math.round((min + max) / 2)}</span>
          <span>{max}</span>
        </div>
        <span />
      </div>
      {filas.map((f) => {
        const ee = f.ee
        const rf = f.ref
        const delta = ee != null && rf != null ? ee - rf : null
        return (
          <div key={f.area} className="bar-row" style={{ gridTemplateColumns: '150px 1fr 120px' }}>
            <span className="lbl">{f.area}</span>
            <div
              className="bar-track"
              style={{ height: 4, background: 'var(--border-soft)', position: 'relative' }}
            >
              {rf != null && (
                <span
                  style={{
                    position: 'absolute',
                    left: `calc(${escala(rf)}% - 5px)`,
                    top: -3,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#fff',
                    border: '2px solid var(--primary)',
                  }}
                  title={`${etiquetaRef}: ${fmtNum(rf, 1)}`}
                />
              )}
              {ee != null && (
                <span
                  style={{
                    position: 'absolute',
                    left: `calc(${escala(ee)}% - 5px)`,
                    top: -3,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background:
                      delta == null || delta >= 0 ? 'var(--accent)' : delta >= -6 ? 'var(--warn)' : 'var(--alert)',
                  }}
                  title={`institución: ${fmtNum(ee, 1)}`}
                />
              )}
            </div>
            <span className="bar-score">
              {ee != null ? fmtNum(ee, 1) : '—'} {delta != null && <Delta valor={delta} modo="pts" />}
            </span>
          </div>
        )
      })}
      <div className="faint" style={{ display: 'flex', gap: 16, marginTop: 2 }}>
        <span>
          <span
            style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: 'var(--accent)', marginRight: 5 }}
          />
          institución
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: '#fff',
              border: '2px solid var(--primary)',
              marginRight: 5,
            }}
          />
          {etiquetaRef}
        </span>
      </div>
    </div>
  )
}
