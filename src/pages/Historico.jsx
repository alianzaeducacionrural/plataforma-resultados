import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import FiltroGlobal from '../components/layout/FiltroGlobal.jsx'
import LineHistorico from '../components/charts/LineHistorico.jsx'
import { PruebaToggle, Semaforo } from '../components/ui.jsx'
import { useFiltro, useModelo } from '../state/store.jsx'
import { fmtNum } from '../lib/format.js'
import { AREAS_S11, historicoGlobalPromedio } from '../lib/model.js'

const COLOR_CLASIF = { 'A+': 'ok', A: 'ok', B: 'ok', C: 'warn', D: 'alert' }

export default function Historico() {
  const { modelo } = useModelo()
  const { aplicar } = useFiltro()
  const [params] = useSearchParams()
  const dane = params.get('dane')
  const inst = dane ? modelo.instituciones.find((i) => i.dane === dane) : null

  if (dane && !inst) {
    return (
      <>
        <PageHeader titulo="Histórico" crumbs={[{ to: '/', label: 'Panorama' }]} />
        <div className="content">
          <p className="muted">No se encontró esa institución.</p>
        </div>
      </>
    )
  }

  return inst ? <HistoricoInstitucion inst={inst} modelo={modelo} /> : <HistoricoDepartamento modelo={modelo} aplicar={aplicar} />
}

function HistoricoDepartamento({ modelo, aplicar }) {
  const lista = useMemo(() => aplicar(modelo.instituciones, { ignorarBusqueda: true }), [modelo, aplicar])
  const agregados = useMemo(() => historicoGlobalPromedio(lista), [lista])
  const anios = agregados.map((a) => a.anio)
  const refCol = modelo.historicoRef?.colombia?.Global || {}
  const refDep = modelo.historicoRef?.departamento?.Global || {}

  const series = [
    {
      key: 'prom',
      label: 'Promedio (filtro actual)',
      color: '#1e8a82',
      data: Object.fromEntries(agregados.map((a) => [a.anio, a.prom != null ? Math.round(a.prom) : null])),
    },
    { key: 'dep', label: 'Caldas', color: '#c99a2e', dashed: true, data: refDep },
    { key: 'col', label: 'Colombia', color: '#2b3440', dashed: true, data: refCol },
  ]

  // distribución de clasificación en el año más reciente disponible
  const ultimoAnio = Math.max(0, ...lista.flatMap((i) => i.historico?.anios ?? []))
  const clasifCounts = { 'A+': 0, A: 0, B: 0, C: 0, D: 0 }
  let conClasif = 0
  for (const i of lista) {
    const c = i.historico?.clasificacion?.[ultimoAnio]
    if (c && clasifCounts[c] != null) {
      clasifCounts[c]++
      conClasif++
    }
  }

  return (
    <>
      <PageHeader titulo="Histórico" />
      <FiltroGlobal conBusqueda={false} />
      <div className="content">
        <PruebaToggle value="saber11" onChange={() => {}} disabledQsqs />
        {!anios.length ? (
          <section className="panel">
            <p className="muted">
              Sin datos históricos para el filtro actual. El histórico cubre 2023-2025 (Puntaje Global
              Saber 11).
            </p>
          </section>
        ) : (
          <>
            <section className="panel">
              <div className="panel-head">
                <h2>Puntaje global — evolución 2023-2025</h2>
                <span className="muted">promedio del conjunto filtrado vs Caldas y Colombia</span>
              </div>
              <LineHistorico anios={[2023, 2024, 2025]} series={series} />
            </section>

            {conClasif > 0 && (
              <section className="panel">
                <div className="panel-head">
                  <h2>Clasificación ICFES — {ultimoAnio}</h2>
                  <span className="muted">{conClasif} instituciones con categoría</span>
                </div>
                <div className="grid cols-5">
                  {Object.entries(clasifCounts).map(([cat, n]) => (
                    <div key={cat} className="kpi">
                      <div className="kpi-label">{cat}</div>
                      <div className="kpi-value">{fmtNum(n)}</div>
                      <div className="kpi-sub">
                        {conClasif ? `${Math.round((n / conClasif) * 100)}%` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <p className="faint">
              Fuente: histórico departamental de Saber 11 (Secretaría de Educación de Caldas). Entrá a
              la ficha de una institución para ver su propia evolución por prueba.
            </p>
          </>
        )}
      </div>
    </>
  )
}

function HistoricoInstitucion({ inst, modelo }) {
  const h = inst.historico
  const anios = h?.anios?.length ? h.anios : [2023, 2024, 2025]
  const refCol = modelo.historicoRef?.colombia || {}
  const refDep = modelo.historicoRef?.departamento || {}

  const serieGlobal = [
    { key: 'inst', label: inst.nombre, color: '#1e8a82', data: h?.global || {} },
    { key: 'dep', label: 'Caldas', color: '#c99a2e', dashed: true, data: refDep.Global || {} },
    { key: 'col', label: 'Colombia', color: '#2b3440', dashed: true, data: refCol.Global || {} },
  ]

  return (
    <>
      <PageHeader
        titulo={`Histórico — ${inst.nombre}`}
        crumbs={[
          { to: '/instituciones', label: 'Instituciones' },
          { to: `/instituciones/${inst.dane}`, label: inst.nombre },
        ]}
      />
      <div className="content">
        <PruebaToggle value="saber11" onChange={() => {}} disabledQsqs />
        {!h ? (
          <section className="panel">
            <p className="muted">Esta institución no tiene histórico 2023-2025 cargado.</p>
          </section>
        ) : (
          <>
            {Object.keys(h.clasificacion).length > 0 && (
              <div className="grid auto">
                {h.anios.map(
                  (a) =>
                    h.clasificacion[a] && (
                      <div key={a} className="kpi">
                        <div className="kpi-label">Clasificación {a}</div>
                        <div className="kpi-value">
                          <Semaforo
                            estado={COLOR_CLASIF[h.clasificacion[a]] || 'na'}
                            texto={h.clasificacion[a]}
                          />
                        </div>
                      </div>
                    ),
                )}
              </div>
            )}

            <section className="panel">
              <div className="panel-head">
                <h2>Puntaje global — evolución 2023-2025</h2>
              </div>
              <LineHistorico anios={anios} series={serieGlobal} />
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Por prueba — evolución 2023-2025</h2>
              </div>
              {AREAS_S11.map((area) => {
                const serieArea = [
                  { key: 'inst', label: inst.nombre, color: '#1e8a82', data: h.areas[area] || {} },
                  { key: 'dep', label: 'Caldas', color: '#c99a2e', dashed: true, data: refDep[area] || {} },
                  { key: 'col', label: 'Colombia', color: '#2b3440', dashed: true, data: refCol[area] || {} },
                ]
                const tieneDato = Object.keys(h.areas[area] || {}).length > 0
                if (!tieneDato) return null
                return (
                  <details key={area} style={{ marginBottom: 8 }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '6px 0' }}>{area}</summary>
                    <LineHistorico anios={anios} series={serieArea} decimales={1} />
                  </details>
                )
              })}
            </section>
          </>
        )}
        <p className="faint">
          <Link to="/historico">← Ver histórico departamental</Link>
        </p>
      </div>
    </>
  )
}
