import { useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import FiltroGlobal from '../components/layout/FiltroGlobal.jsx'
import { CargandoQsqs } from '../components/Estado.jsx'
import { Delta, PruebaToggle } from '../components/ui.jsx'
import { useFiltro, useModelo } from '../state/store.jsx'
import { fmtNum, pct } from '../lib/format.js'
import { PESO_AREA } from '../data/saber11.js'
import { aprendizajesFlojos, competenciasQsqs, media } from '../lib/model.js'
import { institucionesAAcompanarQsqs, institucionesAAcompanarSaber11 } from '../lib/ruta.js'
import { imprimir } from '../lib/exportar.js'

const aFicha = (dane) => `/instituciones/${dane}?ruta=1`

/**
 * Ruta de mejoramiento DEPARTAMENTAL: a qué instituciones acompañar primero y qué focos se repiten en el
 * territorio. La ruta detallada de cada institución (evidencias, afirmaciones y seguimiento entre
 * aplicaciones) vive en su ficha; un enlace viejo con `?dane=` redirige allá.
 */
export default function RutaMejoramiento() {
  const { modelo, q26Estado } = useModelo()
  const { aplicar } = useFiltro()
  const [params] = useSearchParams()
  const [prueba, setPrueba] = useState('saber11')
  const dane = params.get('dane')
  const q26Cargando = q26Estado === 'cargando' || q26Estado === 'espera'

  const lista = useMemo(() => aplicar(modelo.instituciones, { ignorarBusqueda: true }), [modelo, aplicar])

  // --- Saber 11: aprendizajes por debajo de Colombia, por impacto ---
  const s11 = useMemo(() => {
    const flojos = aprendizajesFlojos(lista, { limite: 200 }).filter((f) => f.gap < -0.02)
    return flojos
      .map((f) => ({ ...f, score: -f.gap * (PESO_AREA[f.area] || 1) * Math.max(1, f.n) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
  }, [lista])
  const acompS11 = useMemo(() => institucionesAAcompanarSaber11(lista), [lista])

  // --- QSQS: competencias por debajo de Colombia ---
  const qsqs = useMemo(() => {
    const by = new Map()
    for (const i of q26Cargando ? [] : lista) {
      for (const c of competenciasQsqs(i)) {
        if (c.ee == null || c.colombia == null) continue
        const k = c.area + ' ‖ ' + c.grado + ' ‖ ' + c.competencia
        if (!by.has(k)) by.set(k, { ...c, ee: [], col: [], ee1: [] })
        by.get(k).ee.push(c.ee)
        by.get(k).col.push(c.colombia)
        if (c.ee1 != null) by.get(k).ee1.push(c.ee1)
      }
    }
    return [...by.values()]
      .map((c) => {
        const ee = media(c.ee)
        const col = media(c.col)
        const ee1 = media(c.ee1)
        return { ...c, ee, col, ee1, cambio: ee1 != null ? ee - ee1 : null, gap: ee - col }
      })
      .filter((c) => c.gap < -0.02)
      .sort((a, b) => a.gap - b.gap)
      .slice(0, 8)
  }, [lista, q26Cargando])
  const acompQ = useMemo(() => institucionesAAcompanarQsqs(q26Cargando ? [] : lista), [lista, q26Cargando])

  if (dane) return <Navigate to={aFicha(dane)} replace />

  return (
    <>
      <PageHeader titulo="Ruta de mejoramiento — departamento" crumbs={[{ to: '/', label: 'Panorama' }]}>
        <button type="button" className="btn ghost sm no-print" onClick={imprimir}>
          ⬇ Exportar (PDF)
        </button>
      </PageHeader>
      <FiltroGlobal conBusqueda={false} />

      <div className="content">
        <PruebaToggle value={prueba} onChange={setPrueba} />
        <div className="narrativa">
          Esta vista ayuda a decidir <strong>dónde acompañar primero</strong>. Abajo están las instituciones que más lo
          necesitan y los focos que más se repiten; la ruta detallada de cada institución (evidencias, afirmaciones y
          seguimiento entre aplicaciones) está en su ficha. Los focos se ordenan con un criterio de la plataforma:{' '}
          brecha frente a Colombia × peso {prueba === 'saber11' ? 'de la prueba' : 'del área'} × alcance.
        </div>

        {prueba === 'saber11' ? (
          <>
            <section className="panel">
              <div className="panel-head">
                <h2>Instituciones a acompañar primero</h2>
                <span className="muted">más pruebas claramente por debajo de Colombia</span>
              </div>
              {acompS11.length ? (
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Institución</th>
                        <th>Municipio</th>
                        <th className="num">Puntaje global</th>
                        <th className="num">vs Colombia</th>
                        <th>Pruebas por debajo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acompS11.map((d) => (
                        <tr key={d.dane}>
                          <td>
                            <Link to={aFicha(d.dane)} className="cell-strong">
                              {d.nombre}
                            </Link>
                          </td>
                          <td>{d.municipio}</td>
                          <td className="num">{fmtNum(d.global)}</td>
                          <td className="num">{d.gapGlobalCol != null ? <Delta valor={d.gapGlobalCol} modo="pts" /> : '—'}</td>
                          <td>
                            <span className="tag alert" title={d.areasPrioritarias.join(' · ')}>
                              {d.areasPrioritarias.length} {d.areasPrioritarias.length === 1 ? 'prueba' : 'pruebas'}
                            </span>{' '}
                            <span className="faint">{d.areasPrioritarias.join(', ')}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">Ninguna institución tiene pruebas claramente por debajo de Colombia con este filtro.</p>
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Saber 11 — aprendizajes prioritarios</h2>
                <span className="muted">{s11.length} focos</span>
              </div>
              <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {s11.map((f, i) => (
                  <li key={i}>
                    <div style={{ fontWeight: 700 }}>{f.aprendizaje}</div>
                    <div className="muted">
                      {f.area} · {f.competencia} · % responde mal {pct(f.ee)} vs Colombia {pct(f.col)}{' '}
                      <Delta valor={f.gap} modo="pct" /> · {f.n} instituciones
                    </div>
                    <div className="faint">
                      <Link to={`/areas?area=${encodeURIComponent(f.area)}`}>Ver la prueba completa →</Link>
                    </div>
                  </li>
                ))}
                {!s11.length && <li className="muted">Sin brechas relevantes en Saber 11 para este alcance.</li>}
              </ol>
            </section>
          </>
        ) : q26Cargando ? (
          <CargandoQsqs />
        ) : (
          <>
            <section className="panel">
              <div className="panel-head">
                <h2>Instituciones a acompañar primero</h2>
                <span className="muted">competencias en rango Muy bajo o Bajo (Aplicación 2)</span>
              </div>
              {acompQ.length ? (
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Institución</th>
                        <th>Municipio</th>
                        <th className="num">Competencias en rango bajo</th>
                        <th className="num">Ya estaban bajas en la Aplic. 1</th>
                        <th className="num">% de acierto promedio</th>
                        <th className="num">Cambio Aplic. 1 → 2</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acompQ.map((f) => (
                        <tr key={f.inst.dane}>
                          <td>
                            <Link to={aFicha(f.inst.dane)} className="cell-strong">
                              {f.inst.nombre}
                            </Link>
                          </td>
                          <td>{f.inst.municipio}</td>
                          <td className="num">
                            {f.bajas} de {f.total}
                          </td>
                          <td className="num">{f.persisten}</td>
                          <td className="num">{pct(f.prom)}</td>
                          <td className="num">{f.cambio != null ? <Delta valor={f.cambio * 100} modo="pts" /> : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">Ninguna institución tiene competencias en rango bajo con este filtro.</p>
              )}
              <p className="faint">
                Se ordenan primero las que tienen más competencias que ya estaban bajas en la Aplicación 1 (las que
                persisten). Entra a la ficha para ver las evidencias y afirmaciones que hay que priorizar.
              </p>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>QSQS — competencias prioritarias</h2>
                <span className="muted">{qsqs.length} focos</span>
              </div>
              <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {qsqs.map((c, i) => (
                  <li key={i}>
                    <div style={{ fontWeight: 700 }}>
                      {c.competencia} <span className="faint">· {c.area} · grado {c.grado}°</span>
                    </div>
                    <div className="muted">
                      % de acierto {pct(c.ee)} vs Colombia {pct(c.col)} <Delta valor={c.gap} modo="pct" />
                      {c.cambio != null && (
                        <>
                          {' '}
                          · Aplicación 1 → 2: {pct(c.ee1)} → {pct(c.ee)} <Delta valor={c.cambio * 100} modo="pts" /> pts
                        </>
                      )}
                    </div>
                  </li>
                ))}
                {!qsqs.length && <li className="muted">Sin brechas relevantes en QSQS para este alcance.</li>}
              </ol>
            </section>
          </>
        )}
      </div>
    </>
  )
}
