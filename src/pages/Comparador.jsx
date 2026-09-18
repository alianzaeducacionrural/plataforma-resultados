import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import BarrasComparativas from '../components/charts/BarrasComparativas.jsx'
import { Delta, PruebaToggle, Semaforo } from '../components/ui.jsx'
import { CargandoQsqs } from '../components/Estado.jsx'
import { useModelo } from '../state/store.jsx'
import { fmtNum, pct } from '../lib/format.js'
import { AREAS_S11, bandaGlobal, competenciasQsqs } from '../lib/model.js'
import { exportarCsv } from '../lib/exportar.js'
import { PALETA_INSTITUCIONES as PALETA } from '../lib/paleta.js'

const MAX = 6

export default function Comparador() {
  const { modelo, q26Estado } = useModelo()
  // QSQS 2026 llega en segundo plano: hasta entonces no se arman las filas de competencias
  const q26Cargando = q26Estado === 'cargando' || q26Estado === 'espera'
  const [prueba, setPrueba] = useState('saber11')
  const [sel, setSel] = useState([])
  const [mun, setMun] = useState('') // municipio del que se elige la institución
  const [pick, setPick] = useState('') // institución elegida, todavía sin agregar

  const opciones = modelo.instituciones
  const elegidas = sel.map((d) => opciones.find((i) => i.dane === d)).filter(Boolean)

  // Solo se ofrecen instituciones con datos de la prueba que se está mirando
  const conDato = useMemo(
    () => opciones.filter((i) => (prueba === 'saber11' ? i.tieneS11 : i.tieneQsqs)),
    [opciones, prueba],
  )
  const municipios = useMemo(() => {
    const cuenta = new Map()
    for (const i of conDato) if (i.municipio && i.municipio !== '—') cuenta.set(i.municipio, (cuenta.get(i.municipio) ?? 0) + 1)
    return [...cuenta].sort((a, b) => a[0].localeCompare(b[0], 'es'))
  }, [conDato])
  const deMunicipio = useMemo(
    () =>
      conDato
        .filter((i) => i.municipio === mun && !sel.includes(i.dane))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [conDato, mun, sel],
  )
  const lleno = sel.length >= MAX

  const agregar = () => {
    if (!pick || lleno || sel.includes(pick)) return
    setSel([...sel, pick])
    setPick('') // el municipio se queda, para agregar otra del mismo sitio sin volver a elegirlo
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
    for (const i of q26Cargando ? [] : elegidas) {
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
          if (c?.ee == null) return '—'
          // Aplicación 2 y, entre paréntesis, cuánto cambió respecto de la Aplicación 1 (en puntos)
          return (
            <>
              {pct(c.ee)} {c.delta != null && <Delta valor={c.delta * 100} modo="pts" />}
            </>
          )
        },
        raw: (i) => competenciasQsqs(i).find((x) => x.grado === grado && x.area === area && x.competencia === competencia)?.ee,
        num: true,
      })
    }
    return r
  }, [elegidas, q26Cargando])

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
            <h2>Elige las instituciones a comparar</h2>
            <span className="cmp-cuenta">
              {sel.length} de {MAX}
            </span>
          </div>

          <div className="cmp-selector">
            <div className="field">
              <label htmlFor="cmp-mun">1 · Municipio</label>
              <select
                id="cmp-mun"
                value={mun}
                onChange={(e) => {
                  setMun(e.target.value)
                  setPick('')
                }}
              >
                <option value="">Elige un municipio…</option>
                {municipios.map(([m, n]) => (
                  <option key={m} value={m}>
                    {m} ({n})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cmp-inst">2 · Institución</label>
              <select id="cmp-inst" value={pick} disabled={!mun || lleno} onChange={(e) => setPick(e.target.value)}>
                <option value="">
                  {lleno
                    ? `Ya elegiste el máximo (${MAX})`
                    : !mun
                      ? 'Primero elige el municipio'
                      : deMunicipio.length
                        ? 'Selecciona una institución…'
                        : 'Ya agregaste todas las de este municipio'}
                </option>
                {deMunicipio.map((i) => (
                  <option key={i.dane} value={i.dane}>
                    {i.nombre}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn primary cmp-agregar" disabled={!pick || lleno} onClick={agregar}>
              <span aria-hidden="true">＋</span> Agregar
            </button>
          </div>

          {elegidas.length ? (
            <>
              <div className="cmp-lista">
                {elegidas.map((i, k) => (
                  <div key={i.dane} className="cmp-card" style={{ '--c': PALETA[k % PALETA.length] }}>
                    <div className="cmp-card-txt">
                      <strong>{i.nombre}</strong>
                      <span>{[i.municipio, i.zona, i.sector].filter(Boolean).join(' · ')}</span>
                    </div>
                    <button
                      type="button"
                      className="cmp-x"
                      title="Quitar de la comparación"
                      aria-label={`Quitar ${i.nombre}`}
                      onClick={() => setSel(sel.filter((d) => d !== i.dane))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div>
                <button type="button" className="btn ghost sm" onClick={() => setSel([])}>
                  Quitar todas
                </button>
              </div>
            </>
          ) : (
            <div className="cmp-vacio">
              Todavía no has agregado instituciones. Elige un municipio, selecciona la institución y pulsa{' '}
              <strong>Agregar</strong>.
            </div>
          )}
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

            {prueba === 'qsqs' &&
              (q26Cargando ? (
                <CargandoQsqs />
              ) : (
                modelo.q26?.disponible && (
                  <p className="faint" style={{ margin: 0 }}>
                    Competencias QSQS — Aplicación 2 de 2026; entre paréntesis, el cambio frente a la Aplicación 1 (en
                    puntos porcentuales).
                  </p>
                )
              ))}

            <section className="panel">
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th></th>
                      {elegidas.map((i, k) => (
                        <th key={i.dane}>
                          <span className="cmp-th">
                            <span className="dot" style={{ background: PALETA[k % PALETA.length] }} />
                            <Link to={`/instituciones/${i.dane}`}>{i.nombre}</Link>
                          </span>
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
          <p className="muted">Agrega al menos 2 instituciones para ver la comparación.</p>
        )}
      </div>
    </>
  )
}
