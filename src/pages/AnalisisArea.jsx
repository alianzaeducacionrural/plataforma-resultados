import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import FiltroGlobal from '../components/layout/FiltroGlobal.jsx'
import { BarRow, Delta } from '../components/ui.jsx'
import { useFiltro, useModelo } from '../state/store.jsx'
import { fmtNum, pct } from '../lib/format.js'
import { AREAS_S11, aprendizajesFlojos, media, resumenAreasS11, semaforo } from '../lib/model.js'

export default function AnalisisArea() {
  const { modelo } = useModelo()
  const { aplicar, filtro, set } = useFiltro()
  const [params, setParams] = useSearchParams()
  const area = params.get('area') || AREAS_S11[1]

  // El Heatmap del Panorama navega acá con ?municipio= además de ?area= — lo aplicamos
  // al filtro global (una sola vez al entrar) y lo sacamos de la URL para que de ahí en
  // más el filtro se maneje desde el selector de FiltroGlobal, no desde el param.
  useEffect(() => {
    const m = params.get('municipio')
    if (!m) return
    if (m !== filtro.municipio) set({ municipio: m })
    const next = new URLSearchParams(params)
    next.delete('municipio')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lista = useMemo(() => aplicar(modelo.instituciones, { ignorarBusqueda: true }), [modelo, aplicar])

  const conArea = lista
    .map((i) => {
      const a = i.areasS11?.find((x) => x.area === area)
      return a && a.ee != null ? { inst: i, ee: a.ee, ref: a.ref, gap: a.gapCol } : null
    })
    .filter(Boolean)
    .sort((x, y) => x.ee - y.ee)

  const resumen = useMemo(() => resumenAreasS11(lista).find((r) => r.area === area), [lista, area])
  const flojos = useMemo(() => aprendizajesFlojos(lista, { area, limite: 10 }), [lista, area])
  const promColombia = media(conArea.map((x) => x.ref?.Colombia).filter((v) => v != null))

  return (
    <>
      <PageHeader titulo="Análisis por área" crumbs={[{ to: '/', label: 'Panorama' }]}>
        <label className="chip">
          Área&nbsp;
          <select
            value={area}
            onChange={(e) => setParams({ area: e.target.value }, { replace: true })}
            style={{ border: 'none', background: 'none', font: 'inherit' }}
          >
            {AREAS_S11.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </PageHeader>
      <FiltroGlobal conBusqueda={false} />

      <div className="content">
        {resumen?.gap != null && (
          <div className="narrativa">
            En <strong>{area}</strong>: promedio <strong>{fmtNum(resumen.prom, 1)}</strong> / 100,{' '}
            <strong>{fmtNum(resumen.gap, 1)}</strong> pts frente a Colombia.{' '}
            <strong>{resumen.bajoColombia}</strong> de {resumen.conDato} instituciones están por debajo
            del promedio nacional.
          </div>
        )}

        <section className="panel">
          <div className="panel-head">
            <h2>Instituciones en {area}</h2>
            <span className="muted">{conArea.length} con dato · ordenadas de menor a mayor</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {conArea.slice(0, 40).map((x) => (
              <BarRow
                key={x.inst.dane}
                label={
                  <Link to={`/instituciones/${x.inst.dane}`}>
                    {x.inst.nombre} <span className="faint">· {x.inst.municipio}</span>
                  </Link>
                }
                value={x.ee}
                referencia={promColombia}
                max={100}
                estado={semaforo(x.gap, 'area')}
                refLabel="Colombia"
              />
            ))}
          </div>
          {conArea.length > 40 && (
            <p className="faint">Mostrando las 40 más bajas de {conArea.length}.</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Aprendizajes más flojos del conjunto — {area}</h2>
            <span className="muted">promedio de las instituciones vs Colombia</span>
          </div>
          <p className="faint" style={{ margin: '0 0 10px' }}>
            Los porcentajes son de <strong>error</strong>, no de acierto: "% promedio de estudiantes que
            responde incorrectamente al aprendizaje" (así lo reporta el ICFES). Más alto = peor.
          </p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Aprendizaje</th>
                  <th>Competencia</th>
                  <th className="num">% responde mal</th>
                  <th className="num">Colombia</th>
                  <th className="num">Brecha</th>
                </tr>
              </thead>
              <tbody>
                {flojos.map((f, i) => (
                  <tr key={i}>
                    <td style={{ maxWidth: 420 }}>{f.aprendizaje}</td>
                    <td className="muted">{f.competencia}</td>
                    <td className="num">{pct(f.ee)}</td>
                    <td className="num">{pct(f.col)}</td>
                    <td className="num">
                      <Delta valor={f.gap} modo="pct" />
                    </td>
                  </tr>
                ))}
                {!flojos.length && (
                  <tr>
                    <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 20 }}>
                      Sin aprendizajes con dato para esta área en el filtro actual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  )
}
