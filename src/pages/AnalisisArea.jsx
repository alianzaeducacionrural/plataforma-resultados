import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import FiltroGlobal from '../components/layout/FiltroGlobal.jsx'
import { BarRow, Delta, PruebaToggle } from '../components/ui.jsx'
import { useFiltro, useModelo } from '../state/store.jsx'
import { fmtNum, pct } from '../lib/format.js'
import {
  AREAS_QSQS,
  AREAS_S11,
  aprendizajesFlojos,
  media,
  resumenAreasS11,
  resumenCompetenciasQsqs,
  semaforo,
} from '../lib/model.js'

export default function AnalisisArea() {
  const { modelo } = useModelo()
  const { aplicar, filtro, set } = useFiltro()
  const [params, setParams] = useSearchParams()
  const [prueba, setPrueba] = useState(params.get('prueba') === 'qsqs' ? 'qsqs' : 'saber11')
  const area = params.get('area') || AREAS_S11[1]

  // El Heatmap del Panorama navega acá con ?municipio= (y a veces ?prueba=) — se
  // aplican una sola vez al entrar y se sacan de la URL; de ahí en más el filtro
  // y la prueba se manejan desde los selectores, no desde el param.
  useEffect(() => {
    const m = params.get('municipio')
    if (m && m !== filtro.municipio) set({ municipio: m })
    if (!params.get('municipio') && !params.get('prueba')) return
    const next = new URLSearchParams(params)
    next.delete('municipio')
    next.delete('prueba')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lista = useMemo(() => aplicar(modelo.instituciones, { ignorarBusqueda: true }), [modelo, aplicar])

  return (
    <>
      <PageHeader titulo="Análisis por área" crumbs={[{ to: '/', label: 'Panorama' }]} />
      <FiltroGlobal conBusqueda={false}>
        {prueba === 'saber11' && (
          <div className="field field-area">
            <label htmlFor="fg-area">Área</label>
            <select
              id="fg-area"
              value={area}
              onChange={(e) => setParams({ area: e.target.value }, { replace: true })}
            >
              {AREAS_S11.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        )}
      </FiltroGlobal>

      <div className="content">
        <PruebaToggle value={prueba} onChange={setPrueba} />
        {prueba === 'saber11' ? (
          <AnalisisSaber11 lista={lista} area={area} />
        ) : (
          <AnalisisQsqs lista={lista} />
        )}
      </div>
    </>
  )
}

function AnalisisSaber11({ lista, area }) {
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
        {conArea.length > 40 && <p className="faint">Mostrando las 40 más bajas de {conArea.length}.</p>}
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
    </>
  )
}

function AnalisisQsqs({ lista }) {
  const [area, setArea] = useState('')
  const conQsqs = lista.filter((d) => d.tieneQsqs)
  const competencias = useMemo(
    () => resumenCompetenciasQsqs(lista, { area: area || null, limite: 30 }),
    [lista, area],
  )
  const partProm = media(conQsqs.map((d) => d.participacionQsqs).filter((v) => v != null))
  const ordenPorParticipacion = [...conQsqs].sort((a, b) => (a.participacionQsqs ?? 1) - (b.participacionQsqs ?? 1))

  return (
    <>
      {partProm != null && (
        <div className="narrativa">
          Participación promedio en QSQS: <strong>{pct(partProm)}</strong> sobre {conQsqs.length}{' '}
          instituciones con dato.{' '}
          {competencias[0]?.gap != null && (
            <>
              La competencia con mayor brecha es <strong>{competencias[0].competencia}</strong> (
              {competencias[0].area} · grado {competencias[0].grado}°, {pct(competencias[0].gap)} vs Colombia).
            </>
          )}
        </div>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2>Competencias con mayor brecha</h2>
          <label className="chip">
            Área&nbsp;
            <select value={area} onChange={(e) => setArea(e.target.value)} style={{ border: 'none', background: 'none', font: 'inherit' }}>
              <option value="">Todas</option>
              {AREAS_QSQS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="faint" style={{ margin: '0 0 10px' }}>
          % de acierto promedio del conjunto filtrado, comparado con Colombia — acá sí es acierto (al
          revés que los aprendizajes de Saber 11).
        </p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Competencia</th>
                <th>Área</th>
                <th className="num">Grado</th>
                <th className="num">% acierto</th>
                <th className="num">Colombia</th>
                <th className="num">Brecha</th>
                <th className="num">Instituciones</th>
              </tr>
            </thead>
            <tbody>
              {competencias.map((c, i) => (
                <tr key={i}>
                  <td style={{ maxWidth: 360 }}>{c.competencia}</td>
                  <td className="muted">{c.area}</td>
                  <td className="num">{c.grado}°</td>
                  <td className="num">{pct(c.ee)}</td>
                  <td className="num">{pct(c.col)}</td>
                  <td className="num">
                    <Delta valor={c.gap} modo="pct" />
                  </td>
                  <td className="num">{c.n}</td>
                </tr>
              ))}
              {!competencias.length && (
                <tr>
                  <td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 20 }}>
                    Sin competencias con dato en el filtro actual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Instituciones por participación QSQS</h2>
          <span className="muted">{conQsqs.length} con dato · ordenadas de menor a mayor</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ordenPorParticipacion.slice(0, 40).map((d) => (
            <BarRow
              key={d.dane}
              label={
                <Link to={`/instituciones/${d.dane}`}>
                  {d.nombre} <span className="faint">· {d.municipio}</span>
                </Link>
              }
              value={d.participacionQsqs}
              max={1}
              mode="porcentaje"
              estado={d.participacionQsqs != null && d.participacionQsqs < 0.5 ? 'alert' : 'ok'}
            />
          ))}
          {!ordenPorParticipacion.length && <p className="muted">Sin datos de QSQS en el filtro actual.</p>}
        </div>
        {ordenPorParticipacion.length > 40 && (
          <p className="faint">Mostrando las 40 con menor participación de {ordenPorParticipacion.length}.</p>
        )}
      </section>
    </>
  )
}
