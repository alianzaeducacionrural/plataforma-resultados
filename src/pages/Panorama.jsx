import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import FiltroGlobal from '../components/layout/FiltroGlobal.jsx'
import { KpiRow, Semaforo } from '../components/ui.jsx'
import DistribucionBandas from '../components/charts/DistribucionBandas.jsx'
import Heatmap from '../components/Heatmap.jsx'
import { useFiltro, useModelo } from '../state/store.jsx'
import { fmtNum, pct } from '../lib/format.js'
import {
  heatmapMunicipioArea,
  media,
  promedio,
  resumenAreasS11,
  semaforo,
} from '../lib/model.js'

export default function Panorama() {
  const { modelo } = useModelo()
  const { aplicar, filtro } = useFiltro()

  const lista = useMemo(() => aplicar(modelo.instituciones, { ignorarBusqueda: true }), [modelo, aplicar])
  const conS11 = lista.filter((d) => d.global != null)

  const areas = useMemo(() => resumenAreasS11(lista), [lista])
  const heat = useMemo(() => heatmapMunicipioArea(lista), [lista])

  const promGlobal = promedio(conS11, (d) => d.global)
  const promColombia = media(conS11.map((d) => d.s11?.ref?.Colombia).filter((x) => x != null))
  const gapGlobal = promGlobal != null && promColombia != null ? promGlobal - promColombia : null
  const enAlerta = conS11.filter((d) => d.estadoGlobal === 'alert').length
  const partProm = promedio(
    lista.filter((d) => d.participacionQsqs != null),
    (d) => d.participacionQsqs,
  )

  const focos = [...areas]
    .filter((a) => a.gap != null)
    .sort((a, b) => a.gap * a.peso - b.gap * b.peso)
    .slice(0, 4)

  const alcance =
    filtro.municipio !== 'todos'
      ? filtro.municipio
      : filtro.zona !== 'todas' || filtro.sector !== 'todos'
        ? 'el grupo seleccionado'
        : 'el departamento'

  const kpis = [
    { label: 'Instituciones', value: fmtNum(lista.length), sub: `${conS11.length} con Saber 11 · ${lista.filter((d) => d.tieneQsqs).length} con QSQS` },
    {
      label: 'Puntaje global promedio',
      value: fmtNum(promGlobal),
      unit: '/ 500',
      sub:
        gapGlobal != null
          ? `${gapGlobal >= 0 ? '+' : '−'}${fmtNum(Math.abs(gapGlobal), 1)} pts vs Colombia`
          : 'Saber 11',
      tono: semaforo(gapGlobal, 'global') === 'alert' ? 'alert' : semaforo(gapGlobal, 'global') === 'ok' ? 'ok' : '',
    },
    { label: 'Participación QSQS', value: pct(partProm), sub: 'estudiantes que presentaron' },
    {
      label: 'Instituciones en alerta',
      value: fmtNum(enAlerta),
      sub: `puntaje global muy por debajo de Colombia`,
      tono: enAlerta > 0 ? 'alert' : 'ok',
    },
  ]

  return (
    <>
      <PageHeader titulo="Panorama">
        <span className="chip on">Token maestro</span>
      </PageHeader>
      <FiltroGlobal conBusqueda={false} />

      <div className="content">
        {promGlobal != null && (
          <div className="narrativa">
            En <strong>{alcance}</strong>, el puntaje global promedio de Saber 11 es{' '}
            <strong>{fmtNum(promGlobal)}</strong>
            {gapGlobal != null && (
              <>
                {' '}({gapGlobal >= 0 ? 'por encima' : 'por debajo'} de Colombia por{' '}
                <strong>{fmtNum(Math.abs(gapGlobal), 1)}</strong> puntos)
              </>
            )}
            . {enAlerta > 0 ? (
              <>
                <strong>{enAlerta}</strong> de {conS11.length} instituciones están en alerta.
              </>
            ) : (
              <>Ninguna institución está en alerta grave.</>
            )}{' '}
            {focos[0]?.gap != null && (
              <>
                El área con mayor brecha es <strong>{focos[0].area}</strong> (
                {fmtNum(focos[0].gap, 1)} pts vs Colombia).
              </>
            )}
          </div>
        )}

        <KpiRow items={kpis} />

        <div className="grid cols-2">
          <section className="panel">
            <div className="panel-head">
              <h2>Distribución por banda — puntaje global Saber 11</h2>
              <span className="muted">{conS11.length} instituciones</span>
            </div>
            <DistribucionBandas instituciones={conS11} />
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Desempeño por área</h2>
              <span className="muted">promedio vs Colombia</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {areas.map((a) => (
                <div key={a.area} className="bar-row" style={{ gridTemplateColumns: '150px 1fr 150px' }}>
                  <Link to={`/areas?area=${encodeURIComponent(a.area)}`} className="lbl">
                    {a.area}
                  </Link>
                  <div className="bar-track">
                    {a.prom != null && (
                      <div
                        className={
                          'bar-fill' +
                          (semaforo(a.gap, 'area') === 'alert'
                            ? ' alert'
                            : semaforo(a.gap, 'area') === 'warn'
                              ? ' warn'
                              : '')
                        }
                        style={{ width: (a.prom / 100) * 100 + '%' }}
                      />
                    )}
                    {a.promRef != null && (
                      <div className="bar-ref" style={{ left: (a.promRef / 100) * 100 + '%' }} />
                    )}
                  </div>
                  <span className="bar-score">
                    {a.prom != null ? fmtNum(a.prom, 1) : '—'}{' '}
                    {a.gap != null && (
                      <span className={'delta ' + (a.gap >= 0 ? 'up' : 'down')}>
                        {a.gap >= 0 ? '+' : '−'}
                        {fmtNum(Math.abs(a.gap), 1)}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-head">
            <h2>Focos del período</h2>
            <Link to="/ruta" className="btn ghost sm">
              Ver ruta de mejoramiento
            </Link>
          </div>
          <div className="grid auto">
            {focos.map((f) => (
              <div key={f.area} className={'foco' + (semaforo(f.gap, 'area') === 'warn' ? ' warn' : '')}>
                <div className="foco-title">{f.area}</div>
                <div className="muted">
                  Promedio {fmtNum(f.prom, 1)} / 100 · <strong>{fmtNum(f.gap, 1)}</strong> pts vs Colombia
                </div>
                <div className="faint">
                  {f.bajoColombia} de {f.conDato} instituciones por debajo del promedio nacional
                </div>
                <Link to={`/areas?area=${encodeURIComponent(f.area)}`} style={{ fontSize: 12, marginTop: 2 }}>
                  Analizar {f.area} →
                </Link>
              </div>
            ))}
            {!focos.length && <p className="muted">Sin datos de Saber 11 en el filtro actual.</p>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Mapa de calor — municipio × área</h2>
            <span className="muted">brecha vs Colombia (Saber 11)</span>
          </div>
          <Heatmap muns={heat.muns} filas={heat.filas} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Instituciones en alerta</h2>
            <Link to="/instituciones" className="btn ghost sm">
              Ver todas
            </Link>
          </div>
          {enAlerta ? (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Institución</th>
                    <th>Municipio</th>
                    <th className="num">Puntaje global</th>
                    <th className="num">vs Colombia</th>
                    <th>Áreas por debajo</th>
                  </tr>
                </thead>
                <tbody>
                  {conS11
                    .filter((d) => d.estadoGlobal === 'alert')
                    .sort((a, b) => (a.global ?? 0) - (b.global ?? 0))
                    .slice(0, 12)
                    .map((d) => (
                      <tr key={d.dane} className="clickable">
                        <td>
                          <Link to={`/instituciones/${d.dane}`} className="cell-strong">
                            {d.nombre}
                          </Link>
                        </td>
                        <td>{d.municipio}</td>
                        <td className="num">{fmtNum(d.global)}</td>
                        <td className="num">
                          <span className="delta down">−{fmtNum(Math.abs(d.gapGlobalCol), 1)}</span>
                        </td>
                        <td>
                          {d.areasPrioritarias.length ? (
                            <Semaforo estado="alert" texto={`${d.areasPrioritarias.length} áreas`} />
                          ) : (
                            <span className="faint">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Ninguna institución en alerta grave con el filtro actual.</p>
          )}
        </section>
      </div>
    </>
  )
}
