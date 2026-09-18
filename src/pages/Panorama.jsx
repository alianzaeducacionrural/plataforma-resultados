import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import FiltroGlobal from '../components/layout/FiltroGlobal.jsx'
import { BarRow, BarraRangos, KpiRow, LeyendaRangos, PruebaToggle, Semaforo } from '../components/ui.jsx'
import { CargandoQsqs } from '../components/Estado.jsx'
import Hero from '../components/Hero.jsx'
import EvolucionBarras from '../components/charts/EvolucionBarras.jsx'
import DistribucionBandas from '../components/charts/DistribucionBandas.jsx'
import Heatmap from '../components/Heatmap.jsx'
import { useFiltro, useModelo } from '../state/store.jsx'
import { fmtNum, pct } from '../lib/format.js'
import {
  GRADOS_Q26,
  RANGOS_QSQS,
  avanceGlobalSaber11,
  competenciasEvolucionQsqs,
  evolucionAreasQsqs,
  heatmapMunicipioArea,
  heatmapMunicipioAreaQsqs,
  media,
  promedio,
  rangoQsqs,
  resumenAreasQsqs,
  resumenAreasS11,
  resumenCompetenciasQsqs,
  resumenQsqsInstitucion,
  semaforo,
} from '../lib/model.js'

export default function Panorama() {
  const { modelo } = useModelo()
  const { aplicar, filtro } = useFiltro()
  const [prueba, setPrueba] = useState('saber11')

  const lista = useMemo(() => aplicar(modelo.instituciones, { ignorarBusqueda: true }), [modelo, aplicar])

  const alcance =
    filtro.municipio !== 'todos'
      ? filtro.municipio
      : filtro.zona !== 'todas' || filtro.sector !== 'todos'
        ? 'el grupo seleccionado'
        : 'el departamento'

  return (
    <>
      <PageHeader titulo="Panorama" />
      <FiltroGlobal conBusqueda={false} />
      <div className="content">
        <PruebaToggle value={prueba} onChange={setPrueba} />
        {prueba === 'saber11' ? (
          <PanoramaSaber11 lista={lista} alcance={alcance} />
        ) : (
          <PanoramaQsqs lista={lista} alcance={alcance} />
        )}
      </div>
    </>
  )
}

function PanoramaSaber11({ lista, alcance }) {
  const { modelo } = useModelo()
  const conS11 = lista.filter((d) => d.global != null)
  const areas = useMemo(() => resumenAreasS11(lista), [lista])
  const heat = useMemo(() => heatmapMunicipioArea(lista), [lista])

  const promGlobal = promedio(conS11, (d) => d.global)
  const promColombia = media(conS11.map((d) => d.s11?.ref?.Colombia).filter((x) => x != null))
  const gapGlobal = promGlobal != null && promColombia != null ? promGlobal - promColombia : null
  const enAlerta = conS11.filter((d) => d.estadoGlobal === 'alert').length

  // "Buenas noticias": lo que ya va bien, con cifras reales
  const superan = conS11.filter((d) => d.gapGlobalCol != null && d.gapGlobalCol >= 0).length
  const buenas = conS11.filter((d) => d.global >= 300).length
  const avance = avanceGlobalSaber11(conS11)
  const logros = [
    superan > 0 && { num: fmtNum(superan), texto: 'instituciones igualan o superan el promedio de Colombia' },
    avance?.mejoran > 0 && {
      num: fmtNum(avance.mejoran),
      texto: `de ${fmtNum(avance.total)} instituciones subieron su puntaje global frente a ${avance.previo}`,
    },
    buenas > 0 && { num: fmtNum(buenas), texto: 'instituciones están en banda Bueno o Excelente (300 puntos o más)' },
  ].filter(Boolean)

  const focos = [...areas]
    .filter((a) => a.gap != null)
    .sort((a, b) => a.gap * a.peso - b.gap * b.peso)
    .slice(0, 4)

  const kpis = [
    { label: 'Instituciones con Saber 11', value: fmtNum(conS11.length), sub: `de ${fmtNum(lista.length)} en el filtro` },
    {
      label: 'Puntaje global promedio',
      value: fmtNum(promGlobal),
      unit: '/ 500',
      sub:
        gapGlobal != null
          ? `${gapGlobal >= 0 ? '+' : '−'}${fmtNum(Math.abs(gapGlobal), 1)} pts vs Colombia`
          : 'sin dato',
      tono: semaforo(gapGlobal, 'global') === 'alert' ? 'alert' : semaforo(gapGlobal, 'global') === 'ok' ? 'ok' : '',
    },
    {
      label: 'Instituciones en alerta',
      value: fmtNum(enAlerta),
      sub: `puntaje global muy por debajo de Colombia`,
      tono: enAlerta > 0 ? 'alert' : 'ok',
    },
  ]

  return (
    <>
      {promGlobal != null && (
        <Hero
          kicker={`Saber 11${modelo.anioSaber11 ? ` · ${modelo.anioSaber11}` : ''}`}
          titulo={`Así van los aprendizajes en ${alcance}`}
          logros={logros}
        >
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
              La prueba con mayor brecha es <strong>{focos[0].area}</strong> (
              {fmtNum(focos[0].gap, 1)} pts vs Colombia).
            </>
          )}{' '}
          Este panorama te ayuda a ver dónde acompañar primero para nivelar los aprendizajes.
        </Hero>
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
            <h2>Desempeño por prueba</h2>
            <span className="muted">promedio vs Colombia</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {areas.map((a) => (
              <BarRow
                key={a.area}
                label={<Link to={`/areas?area=${encodeURIComponent(a.area)}`}>{a.area}</Link>}
                value={a.prom}
                referencia={a.promRef}
                max={100}
                estado={semaforo(a.gap, 'area')}
                refLabel="Colombia"
              />
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
          <h2>Mapa de calor — municipio × prueba</h2>
          <span className="muted">brecha vs Colombia (Saber 11)</span>
        </div>
        <Heatmap filas={heat.filas} />
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
                  <th>Pruebas por debajo</th>
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
                          <Semaforo estado="alert" texto={`${d.areasPrioritarias.length} ${d.areasPrioritarias.length === 1 ? 'prueba' : 'pruebas'}`} />
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
    </>
  )
}

// Referencia estable (un [] nuevo en cada render invalidaría los useMemo).
const LISTA_VACIA = []

function PanoramaQsqs({ lista, alcance }) {
  const nav = useNavigate()
  const { modelo, q26Estado } = useModelo()
  // QSQS 2026 entra en segundo plano: mientras llega, los bloques con resultados quedan vacíos
  // (y se avisa arriba) en vez de mostrar por un instante los números de 2025 y después cambiarlos.
  const q26Cargando = q26Estado === 'cargando' || q26Estado === 'espera'
  const q26Listo = !!modelo.q26?.disponible
  const listaRes = q26Cargando ? LISTA_VACIA : lista
  const conQsqs = lista.filter((d) => d.tieneQsqs)
  const areas = useMemo(() => resumenAreasQsqs(listaRes), [listaRes])
  const heat = useMemo(() => heatmapMunicipioAreaQsqs(listaRes), [listaRes])
  const focos = useMemo(() => resumenCompetenciasQsqs(listaRes, { limite: 4 }), [listaRes])
  const evo = useMemo(() => evolucionAreasQsqs(listaRes), [listaRes])
  const [gradoDist, setGradoDist] = useState('5')
  const distGrado = useMemo(() => competenciasEvolucionQsqs(listaRes, { grado: gradoDist }), [listaRes, gradoDist])

  // "Buenas noticias" de QSQS 2026: quiénes mejoraron de la Aplicación 1 a la 2
  const avances = useMemo(() => {
    const res = listaRes.map((d) => resumenQsqsInstitucion(d)).filter(Boolean)
    const ambas = res.filter((q) => q.a1 != null && q.a2 != null)
    const puesto = (v) => RANGOS_QSQS.findIndex((r) => r.nombre === rangoQsqs(v)?.nombre)
    return {
      ambas: ambas.length,
      mejoran: ambas.filter((q) => q.cambio > 0).length,
      suben: ambas.filter((q) => puesto(q.a2) > puesto(q.a1)).length,
      altos: res.filter((q) => q.enA2 && q.rango?.nombre === 'Alto').length,
      prom1: media(ambas.map((q) => q.a1)),
      prom2: media(ambas.map((q) => q.a2)),
    }
  }, [listaRes])
  const logrosQ = [
    avances.mejoran > 0 && {
      num: fmtNum(avances.mejoran),
      texto: `de ${fmtNum(avances.ambas)} instituciones mejoraron de la Aplicación 1 a la 2`,
    },
    avances.suben > 0 && { num: fmtNum(avances.suben), texto: 'instituciones subieron de rango de desempeño' },
    avances.altos > 0 && { num: fmtNum(avances.altos), texto: 'instituciones ya están en rango Alto (70 % o más)' },
  ].filter(Boolean)
  const cambioProm = avances.prom1 != null && avances.prom2 != null ? avances.prom2 - avances.prom1 : null

  const partProm = promedio(
    conQsqs.filter((d) => d.participacionQsqs != null),
    (d) => d.participacionQsqs,
  )
  const qsqsInfo = lista.find((d) => d.qsqs?.anio != null)?.qsqs
  const bajaParticipacion = conQsqs.filter((d) => d.participacionQsqs != null && d.participacionQsqs < 0.5)

  return (
    <>
      {partProm != null && (
        <Hero
          kicker={q26Listo ? 'QSQS · 2026' : 'QSQS'}
          titulo={`Así avanza Quiero Ser Quiero Saber en ${alcance}`}
          logros={logrosQ}
        >
          {cambioProm != null ? (
            <>
              En <strong>{alcance}</strong>, las <strong>{fmtNum(avances.ambas)}</strong> instituciones con las dos
              aplicaciones pasaron de <strong>{pct(avances.prom1)}</strong> de aciertos en la Aplicación 1 a{' '}
              <strong>{pct(avances.prom2)}</strong> en la Aplicación 2 (
              <strong>
                {cambioProm >= 0 ? '+' : '−'}
                {fmtNum(Math.abs(cambioProm) * 100, 1)}
              </strong>{' '}
              puntos).{' '}
            </>
          ) : (
            <>
              En <strong>{alcance}</strong>, la participación promedio en QSQS es <strong>{pct(partProm)}</strong>
              {qsqsInfo && (
                <>
                  {' '}(aplicación {qsqsInfo.aplicacion} de {qsqsInfo.anio})
                </>
              )}
              .{' '}
              {bajaParticipacion.length > 0 ? (
                <>
                  <strong>{bajaParticipacion.length}</strong> de {conQsqs.length} instituciones tienen menos de
                  50% de participación.
                </>
              ) : (
                <>Ninguna institución está por debajo del 50% de participación.</>
              )}{' '}
            </>
          )}
          {focos[0]?.gap != null && (
            <>
              La competencia con mayor brecha es <strong>{focos[0].competencia}</strong> (
              {pct(focos[0].gap)} vs Colombia): ahí es donde más se puede acompañar.
            </>
          )}
        </Hero>
      )}

      <KpiRow
        items={[
          { label: 'Instituciones con QSQS', value: fmtNum(conQsqs.length), sub: `de ${fmtNum(lista.length)} en el filtro` },
          {
            label: 'Participación promedio',
            value: pct(partProm),
            sub: qsqsInfo ? `aplicación ${qsqsInfo.aplicacion} de ${qsqsInfo.anio}` : 'estudiantes que presentaron',
          },
          {
            label: 'Baja participación',
            value: fmtNum(bajaParticipacion.length),
            sub: 'instituciones bajo 50%',
            tono: bajaParticipacion.length > 0 ? 'alert' : 'ok',
          },
        ]}
      />

      {q26Cargando && <CargandoQsqs />}

      <section className="panel">
        <div className="panel-head">
          <h2>Desempeño por área — QSQS</h2>
          <span className="muted">
            % de acierto promedio vs Colombia · {q26Listo ? 'Aplicación 2 de 2026' : 'Aplicación 2 de 2025'}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {areas.map((a) => (
            <BarRow
              key={a.area}
              label={a.area}
              value={a.prom}
              referencia={a.promRef}
              max={1}
              mode="porcentaje"
              estado={semaforo(a.gap, 'frac')}
              refLabel="Colombia"
            />
          ))}
          {!areas.some((a) => a.conDato) && <p className="muted">Sin datos de QSQS en el filtro actual.</p>}
        </div>
      </section>

      {q26Listo && !q26Cargando && (
        <>
          <section className="panel">
            <div className="panel-head">
              <h2>Evolución 2026 · Aplicación 1 → Aplicación 2</h2>
              <span className="muted">% de acierto promedio por grado · barra oscura = Colombia (Aplic. 2)</span>
            </div>
            <div className="grid cols-2">
              {evo.map((a) => (
                <div key={a.area}>
                  <h3 style={{ margin: '0 0 4px' }}>{a.area}</h3>
                  <EvolucionBarras
                    alto={300}
                    filas={a.grados.map((g) => ({ etiqueta: `Grado ${g.grado}°`, a1: g.a1, a2: g.a2, refv: g.col2 }))}
                  />
                </div>
              ))}
            </div>
            <p className="faint">
              Promedio de las instituciones con resultado en cada aplicación (si una institución no presentó la
              prueba, no cuenta). Cada barra resume las competencias del área en ese grado.
            </p>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Instituciones por rango de desempeño</h2>
              <span className="muted">cuántas instituciones caen en cada rango, por competencia</span>
            </div>
            <div className="grado-tabs">
              {GRADOS_Q26.map((g) => (
                <button key={g} type="button" className={g === gradoDist ? 'active' : ''} onClick={() => setGradoDist(g)}>
                  Grado {g}°
                </button>
              ))}
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Competencia</th>
                    <th style={{ width: '28%' }}>Aplicación 1</th>
                    <th style={{ width: '28%' }}>Aplicación 2</th>
                  </tr>
                </thead>
                <tbody>
                  {distGrado.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <span className="cell-strong">{c.competencia}</span>
                        <div className="faint">{c.area}</div>
                      </td>
                      <td>
                        <BarraRangos dist={c.dist1} />
                      </td>
                      <td>
                        <BarraRangos dist={c.dist2} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <LeyendaRangos />
          </section>
        </>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2>Competencias con mayor brecha</h2>
          <Link to="/areas" className="btn ghost sm">
            Ver análisis por área
          </Link>
        </div>
        <div className="grid auto">
          {focos.map((f, i) => (
            <div key={i} className={'foco' + (semaforo(f.gap, 'frac') === 'warn' ? ' warn' : '')}>
              <div className="foco-title">{f.competencia}</div>
              <div className="muted">
                {f.area} · grado {f.grado}° — {pct(f.ee)} vs Colombia {pct(f.col)}
              </div>
              <div className="faint">{f.n} institución{f.n === 1 ? '' : 'es'} con dato</div>
            </div>
          ))}
          {!focos.length && <p className="muted">Sin datos de QSQS en el filtro actual.</p>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Mapa de calor — municipio × área</h2>
          <span className="muted">brecha vs Colombia (QSQS)</span>
        </div>
        <Heatmap
          filas={heat.filas}
          termino="área"
          prueba="QSQS"
          onCelda={(municipio) => nav(`/areas?prueba=qsqs&municipio=${encodeURIComponent(municipio)}`)}
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Instituciones con menor participación</h2>
          <Link to="/instituciones" className="btn ghost sm">
            Ver todas
          </Link>
        </div>
        {conQsqs.length ? (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Institución</th>
                  <th>Municipio</th>
                  <th className="num">Participación</th>
                </tr>
              </thead>
              <tbody>
                {[...conQsqs]
                  .sort((a, b) => (a.participacionQsqs ?? 0) - (b.participacionQsqs ?? 0))
                  .slice(0, 12)
                  .map((d) => (
                    <tr key={d.dane} className="clickable">
                      <td>
                        <Link to={`/instituciones/${d.dane}`} className="cell-strong">
                          {d.nombre}
                        </Link>
                      </td>
                      <td>{d.municipio}</td>
                      <td className="num">{d.participacionQsqs != null ? pct(d.participacionQsqs) : '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Ninguna institución con QSQS en el filtro actual.</p>
        )}
      </section>
    </>
  )
}
