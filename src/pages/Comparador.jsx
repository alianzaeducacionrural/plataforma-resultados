import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import BarrasComparativas from '../components/charts/BarrasComparativas.jsx'
import { Delta, PruebaToggle, Semaforo } from '../components/ui.jsx'
import { useModelo } from '../state/store.jsx'
import { fmtNum, pct } from '../lib/format.js'
import { AREAS_S11, bandaGlobal, competenciasQsqs } from '../lib/model.js'
import { exportarCsv } from '../lib/exportar.js'

export default function Comparador() {
  const { modelo } = useModelo()
  const [prueba, setPrueba] = useState('saber11')
  const [sel, setSel] = useState([])

  const opciones = modelo.instituciones
  const elegidas = sel.map((d) => opciones.find((i) => i.dane === d)).filter(Boolean)

  const agregarMunicipio = (mun) => {
    const conDato = opciones.filter((i) => i.municipio === mun && (prueba === 'saber11' ? i.tieneS11 : i.tieneQsqs))
    const danes = [...conDato]
      .sort((a, b) => (prueba === 'saber11' ? (b.global ?? -1) - (a.global ?? -1) : (b.participacionQsqs ?? -1) - (a.participacionQsqs ?? -1)))
      .slice(0, 6)
      .map((i) => i.dane)
    setSel(danes)
  }

  const filasS11 = useMemo(() => {
    const r = [
      { k: 'Municipio', get: (i) => i.municipio },
      { k: 'Zona · sector', get: (i) => [i.zona, i.sector].filter(Boolean).join(' · ') || '—' },
      {
        k: 'Puntaje global',
        get: (i) => (i.global != null ? fmtNum(i.global) : '—'),
        raw: (i) => i.global,
        num: true,
      },
      {
        k: 'Banda',
        get: (i) => {
          const b = bandaGlobal(i.global)
          return b ? <Semaforo estado={b.clase} texto={b.nombre} /> : <span className="faint">s/d</span>
        },
      },
      {
        k: 'Clasificación ICFES',
        get: (i) =>
          i.clasificacionActual ? (
            <Semaforo
              estado={['A+', 'A', 'B'].includes(i.clasificacionActual) ? 'ok' : i.clasificacionActual === 'C' ? 'warn' : 'alert'}
              texto={i.clasificacionActual}
            />
          ) : (
            <span className="faint">s/d</span>
          ),
      },
      {
        k: 'vs Colombia',
        get: (i) => (i.gapGlobalCol != null ? <Delta valor={i.gapGlobalCol} modo="pts" /> : '—'),
        raw: (i) => i.gapGlobalCol,
        num: true,
      },
    ]
    for (const area of AREAS_S11) {
      r.push({
        k: area,
        get: (i) => {
          const a = i.areasS11?.find((x) => x.area === area)
          return a?.ee != null ? fmtNum(a.ee, 1) : '—'
        },
        raw: (i) => i.areasS11?.find((x) => x.area === area)?.ee,
        num: true,
      })
    }
    return r
  }, [])

  // Filas QSQS: fijas (participación) + una por cada competencia que tenga dato
  // en al menos una de las instituciones elegidas (unión, no todas tienen las mismas).
  const filasQsqs = useMemo(() => {
    const r = [
      { k: 'Municipio', get: (i) => i.municipio },
      { k: 'Zona · sector', get: (i) => [i.zona, i.sector].filter(Boolean).join(' · ') || '—' },
      {
        k: 'Participación QSQS',
        get: (i) => (i.participacionQsqs != null ? pct(i.participacionQsqs) : '—'),
        raw: (i) => i.participacionQsqs,
        num: true,
      },
      {
        k: 'Aplicación',
        get: (i) => (i.qsqs?.anio ? `${i.qsqs.aplicacion}/${i.qsqs.anio}` : '—'),
      },
    ]
    const claves = new Map()
    for (const i of elegidas) {
      for (const c of competenciasQsqs(i)) {
        if (c.ee == null) continue
        const key = c.grado + ' ‖ ' + c.area + ' ‖ ' + c.competencia
        if (!claves.has(key)) claves.set(key, { grado: c.grado, area: c.area, competencia: c.competencia })
      }
    }
    for (const [, { grado, area, competencia }] of [...claves].sort((a, b) => a[0].localeCompare(b[0], 'es'))) {
      r.push({
        k: `${competencia} (${area} · ${grado}°)`,
        get: (i) => {
          const c = competenciasQsqs(i).find((x) => x.grado === grado && x.area === area && x.competencia === competencia)
          return c?.ee != null ? pct(c.ee) : '—'
        },
        raw: (i) => competenciasQsqs(i).find((x) => x.grado === grado && x.area === area && x.competencia === competencia)?.ee,
        num: true,
      })
    }
    return r
  }, [elegidas])

  const filas = prueba === 'saber11' ? filasS11 : filasQsqs

  const mejorPorFila = (f) => {
    if (!f.num) return null
    const vals = elegidas.map((i) => f.raw(i)).filter((v) => v != null)
    return vals.length ? Math.max(...vals) : null
  }

  return (
    <>
      <PageHeader titulo="Comparador">
        {elegidas.length >= 2 && (
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => {
              const cols = ['Métrica', ...elegidas.map((i) => i.nombre)]
              const filasCsv = filas.map((f) => [f.k, ...elegidas.map((i) => f.raw ? f.raw(i) ?? '' : String(f.get(i)))])
              exportarCsv('comparador-instituciones-' + prueba, cols, filasCsv)
            }}
          >
            ⬇ Exportar CSV
          </button>
        )}
      </PageHeader>
      <div className="content">
        <PruebaToggle value={prueba} onChange={setPrueba} />
        <section className="panel">
          <div className="panel-head">
            <h2>Elegí instituciones (hasta 6)</h2>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field grow">
              <label>Agregar institución</label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value && sel.length < 6 && !sel.includes(e.target.value))
                    setSel([...sel, e.target.value])
                }}
              >
                <option value="">Seleccionar…</option>
                {opciones
                  .filter((i) => !sel.includes(i.dane))
                  .map((i) => (
                    <option key={i.dane} value={i.dane}>
                      {i.nombre} — {i.municipio}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label>O comparar un municipio completo</label>
              <select value="" onChange={(e) => e.target.value && agregarMunicipio(e.target.value)}>
                <option value="">Elegir municipio…</option>
                {modelo.municipios.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {elegidas.map((i) => (
              <span key={i.dane} className="chip on">
                {i.nombre}
                <button type="button" onClick={() => setSel(sel.filter((d) => d !== i.dane))}>
                  ×
                </button>
              </span>
            ))}
            {sel.length > 0 && (
              <button type="button" className="btn ghost sm" onClick={() => setSel([])}>
                Limpiar
              </button>
            )}
          </div>
        </section>

        {elegidas.length >= 2 ? (
          <>
            {prueba === 'saber11' && (
              <section className="panel">
                <div className="panel-head">
                  <h2>Puntaje por prueba</h2>
                </div>
                <BarrasComparativas instituciones={elegidas} />
              </section>
            )}

            <section className="panel">
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th></th>
                      {elegidas.map((i) => (
                        <th key={i.dane}>
                          <Link to={`/instituciones/${i.dane}`}>{i.nombre}</Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f) => {
                      const mejor = mejorPorFila(f)
                      return (
                        <tr key={f.k}>
                          <td className="cell-strong">{f.k}</td>
                          {elegidas.map((i) => {
                            const esMejor = f.num && mejor != null && f.raw(i) === mejor
                            return (
                              <td key={i.dane} className={f.num ? 'num' : ''} style={esMejor ? { color: 'var(--accent)', fontWeight: 700 } : undefined}>
                                {f.get(i)}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <p className="muted">Elegí al menos 2 instituciones (o un municipio) para comparar.</p>
        )}
      </div>
    </>
  )
}
