import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInstitucionParam } from '../App.jsx'
import PageHeader from '../components/layout/PageHeader.jsx'
import { BarRow, Delta, KpiRow, NivelesBar } from '../components/ui.jsx'
import { ErrorEstado } from '../components/Estado.jsx'
import DotPlotAreas from '../components/charts/DotPlotAreas.jsx'
import MapaDesempeno from '../components/MapaDesempeno.jsx'
import { useModelo } from '../state/store.jsx'
import { fmtNum, pct } from '../lib/format.js'
import { hallazgosInstitucion } from '../lib/hallazgos.js'
import { imprimir } from '../lib/exportar.js'
import {
  AREAS_S11,
  bandaGlobal,
  competenciasQsqs,
  media,
  REF_LABEL,
  semaforo,
} from '../lib/model.js'

const REFS = ['Municipio', 'ETC', 'Colombia', 'Oficiales rurales', 'Privados']

export default function FichaInstitucion() {
  const inst = useInstitucionParam()
  const { modelo } = useModelo()
  const [ref, setRef] = useState('Colombia')
  const [areaAbierta, setAreaAbierta] = useState(null)

  const pares = useMemo(
    () => (inst ? modelo.instituciones.filter((i) => i.municipio === inst.municipio && i.tieneS11) : []),
    [modelo, inst],
  )

  if (!inst) return <ErrorEstado mensaje="No se encontró la institución para este enlace." />

  const s = inst.s11
  const q = inst.qsqs
  const banda = bandaGlobal(inst.global)

  // valor de la referencia elegida para el puntaje global
  const refGlobal =
    ref === 'Municipio'
      ? media(pares.map((p) => p.global))
      : (s?.ref?.[ref === 'ETC' ? 'ETC' : ref] ?? null)
  const gapGlobal = inst.global != null && refGlobal != null ? inst.global - refGlobal : null

  // puesto en el municipio
  const ranking = [...pares].sort((a, b) => (b.global ?? -1) - (a.global ?? -1))
  const puesto = ranking.findIndex((p) => p.dane === inst.dane) + 1

  const refArea = (area) => {
    if (ref === 'Municipio') {
      const vals = pares.map((p) => p.areasS11?.find((x) => x.area === area)?.ee).filter((v) => v != null)
      return media(vals)
    }
    const a = s?.areas?.find((x) => x.area === area)
    return a?.ref?.[ref] ?? null
  }

  const kpis = [
    {
      label: 'Puntaje global Saber 11',
      value: inst.global != null ? fmtNum(inst.global) : '—',
      unit: '/ 500',
      sub: banda ? `Banda: ${banda.nombre}` : 's/d',
      tono: banda ? banda.clase : '',
    },
    {
      label: `vs ${REF_LABEL[ref] || ref}`,
      value: gapGlobal != null ? (gapGlobal >= 0 ? '+' : '−') + fmtNum(Math.abs(gapGlobal), 1) : '—',
      unit: 'pts',
      tono: semaforo(gapGlobal, 'global'),
    },
    {
      label: 'Puesto en el municipio',
      value: puesto ? `${puesto}º` : '—',
      sub: `de ${pares.length} con Saber 11 en ${inst.municipio}`,
    },
    {
      label: 'Presentaron Saber 11',
      value: s?.presentes != null ? fmtNum(s.presentes) : '—',
      sub: s?.inscritos != null ? `de ${fmtNum(s.inscritos)} inscritos` : '',
    },
  ]

  const comps = q ? competenciasQsqs(inst) : []
  const compsPorArea = {}
  for (const c of comps) {
    const k = c.area
    ;(compsPorArea[k] = compsPorArea[k] || []).push(c)
  }

  return (
    <>
      <PageHeader
        titulo={inst.nombre}
        crumbs={[
          { to: '/instituciones', label: 'Instituciones' },
          { label: inst.municipio },
        ]}
      >
        <label className="chip">
          Comparar contra&nbsp;
          <select value={ref} onChange={(e) => setRef(e.target.value)} style={{ border: 'none', background: 'none', font: 'inherit' }}>
            {REFS.map((r) => (
              <option key={r} value={r}>
                {REF_LABEL[r] || r}
              </option>
            ))}
          </select>
        </label>
        <Link to={`/ruta?dane=${inst.dane}`} className="btn primary sm">
          Ruta de mejoramiento
        </Link>
        <button type="button" className="btn ghost sm no-print" onClick={imprimir}>
          ⬇ Exportar informe (PDF)
        </button>
      </PageHeader>

      <div className="content">
        <div className="muted">
          DANE {inst.dane} · {[inst.zona, inst.sector].filter(Boolean).join(' · ') || 'zona/sector s/d'}
          {q?.anio ? ` · QSQS aplicación ${q.aplicacion}/${q.anio}` : ''}
        </div>

        <KpiRow items={kpis} />

        {/* ---------- Reporte comparativo ---------- */}
        {s && (
          <div className="grid cols-2">
            <section className="panel">
              <div className="panel-head">
                <h2>Comparación por área</h2>
                <span className="muted">vs {REF_LABEL[ref] || ref}</span>
              </div>
              <DotPlotAreas
                filas={AREAS_S11.map((area) => {
                  const a = s.areas.find((x) => x.area === area)
                  return { area, ee: a?.ee ?? null, ref: refArea(area) }
                })}
                etiquetaRef={REF_LABEL[ref] || ref}
              />
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Hallazgos</h2>
                <span className="muted">lectura académica, no causal</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {hallazgosInstitucion(inst, pares).map((h, i) => (
                  <div key={i} className="foco" style={{ borderLeftColor: 'var(--border)' }}>
                    <div className="foco-title">
                      {h.icono} {h.titulo}
                    </div>
                    <div className="muted">{h.texto}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {s && pares.length > 1 && (
          <section className="panel">
            <div className="panel-head">
              <h2>Mapa de desempeño — {inst.municipio}</h2>
              <span className="muted">{pares.length} instituciones con Saber 11 · esta institución resaltada</span>
            </div>
            <MapaDesempeno instituciones={pares} foco={inst} />
          </section>
        )}

        {/* ---------- Saber 11 (detalle) ---------- */}
        <section className="panel">
          <div className="panel-head">
            <h2>Saber 11 — detalle por área, grado 11°</h2>
            <span className="muted">
              barra = institución · marca vertical = {REF_LABEL[ref] || ref}
            </span>
          </div>

          {!s ? (
            <p className="muted">Esta institución no tiene resultados de Saber 11 cargados.</p>
          ) : (
            <>
              <BarRow
                label={<strong>Puntaje global</strong>}
                value={inst.global}
                referencia={refGlobal}
                max={500}
                estado={semaforo(gapGlobal, 'global')}
                refLabel={REF_LABEL[ref] || ref}
              />
              <div style={{ height: 6 }} />
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Área</th>
                      <th className="num">Puntaje</th>
                      <th className="num">vs {REF_LABEL[ref] || ref}</th>
                      <th style={{ width: 220 }}>Niveles de desempeño (1–4)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {AREAS_S11.map((area) => {
                      const a = s.areas.find((x) => x.area === area)
                      if (!a) return null
                      const r = refArea(area)
                      const gap = a.ee != null && r != null ? a.ee - r : null
                      const est = semaforo(gap, 'area')
                      const abierta = areaAbierta === area
                      const aprs = (s.aprendizajes || [])
                        .filter((x) => x.area === area && x.ee != null)
                        .map((x) => ({ ...x, gap: x.colombia != null ? x.ee - x.colombia : null }))
                        .sort((x, y) => (x.gap ?? 0) - (y.gap ?? 0))
                      return (
                        <FragmentRow
                          key={area}
                          abierta={abierta}
                          onToggle={() => setAreaAbierta(abierta ? null : area)}
                          area={area}
                          a={a}
                          r={r}
                          gap={gap}
                          est={est}
                          aprs={aprs}
                          refNombre={REF_LABEL[ref] || ref}
                        />
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* ---------- QSQS ---------- */}
        <section className="panel">
          <div className="panel-head">
            <h2>Quiero Ser Quiero Saber</h2>
            {q?.participacion != null && (
              <span className="muted">participación {pct(q.participacion)}</span>
            )}
          </div>

          {!q ? (
            <p className="muted">Esta institución no tiene resultados de QSQS cargados.</p>
          ) : (
            <>
              {q.porGrado?.some((g) => g.registrados) && (
                <div className="grid auto">
                  {q.porGrado
                    .filter((g) => g.registrados)
                    .map((g) => (
                      <div key={g.grado} className="foco warn" style={{ borderLeftColor: 'var(--accent)' }}>
                        <div className="foco-title">Grado {g.grado}°</div>
                        <div className="muted">
                          Participación <strong>{pct(g.participacion)}</strong> ({fmtNum(g.participantes)}/
                          {fmtNum(g.registrados)})
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {comps.length > 0 ? (
                Object.entries(compsPorArea).map(([area, list]) => (
                  <div key={area}>
                    <h3 style={{ margin: '10px 0 6px' }}>{area}</h3>
                    {list.map((c) => {
                      const rComp = ref === 'Colombia' ? c.colombia : ref === 'ETC' ? c.etc : c.colombia
                      const gap = c.ee != null && rComp != null ? c.ee - rComp : null
                      return (
                        <details key={c.grado + c.competencia} style={{ marginBottom: 4 }}>
                          <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
                            <BarRow
                              label={`${c.competencia}  ·  ${c.grado}°`}
                              value={c.ee}
                              referencia={rComp}
                              max={1}
                              mode="porcentaje"
                              estado={semaforo(gap, 'frac')}
                              refLabel={ref === 'ETC' ? 'Caldas' : 'Colombia'}
                            />
                          </summary>
                          <div style={{ padding: '4px 0 8px 20px' }}>
                            {c.afirmaciones.map((af, i) => (
                              <BarRow
                                key={i}
                                label={<span className="faint">{af.texto || `Afirmación ${af.idAfirmacion}`}</span>}
                                value={af.ee}
                                referencia={ref === 'ETC' ? af.etc : af.colombia}
                                max={1}
                                mode="porcentaje"
                                estado={semaforo(af.ee != null && af.colombia != null ? af.ee - af.colombia : null, 'frac')}
                              />
                            ))}
                          </div>
                        </details>
                      )
                    })}
                  </div>
                ))
              ) : (
                <p className="muted">
                  Hay resultados por afirmación pero no se pudieron agrupar por competencia (falta el
                  diccionario para esos grados).
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </>
  )
}

function FragmentRow({ abierta, onToggle, area, a, r, gap, est, aprs, refNombre }) {
  return (
    <>
      <tr className="clickable" onClick={onToggle}>
        <td className="cell-strong">{area}</td>
        <td className="num">{a.ee != null ? fmtNum(a.ee, 1) : '—'}</td>
        <td className="num">
          {gap != null ? <Delta valor={gap} modo="pts" /> : '—'}
        </td>
        <td>
          <NivelesBar niveles={a.niveles} />
        </td>
        <td className="num">
          <span className="faint">{abierta ? '▲' : '▼'}</span>
        </td>
      </tr>
      {abierta && (
        <tr className="detail-tr">
          <td colSpan={5}>
            <div className="detail">
              <div className="muted">
                Aprendizajes evaluados en {area}, ordenados por brecha vs Colombia (barra = institución,
                marca = Colombia):
              </div>
              {aprs.length ? (
                aprs.map((x, i) => (
                  <BarRow
                    key={i}
                    label={<span className="faint">{x.aprendizaje}</span>}
                    value={x.ee}
                    referencia={x.colombia}
                    max={1}
                    mode="porcentaje"
                    estado={semaforo(x.gap, 'frac')}
                  />
                ))
              ) : (
                <span className="faint">Sin aprendizajes con dato para esta área.</span>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
