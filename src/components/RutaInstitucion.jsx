import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarraRangos, Delta, KpiRow, LeyendaRangos, RangoTag } from './ui.jsx'
import { exportarCsv } from '../lib/exportar.js'
import { fmtNum, pct } from '../lib/format.js'
import { AREAS_S11, aprendizajesFlojos, arbolQsqs26 } from '../lib/model.js'
import { analizarInstitucionQsqs, estadoSeguimiento, filasAnexoA } from '../lib/ruta.js'

// Los siete momentos de la Guía Orientadora. `plat`: los que salen de los datos y la plataforma
// acompaña; el resto (PFAP, intervención y mejoramiento) los hace la institución.
const MOMENTOS = [
  { t: 'Resultados', plat: true },
  { t: 'Análisis', plat: true },
  { t: 'Priorización', plat: true },
  { t: 'PFAP', plat: false },
  { t: 'Intervención pedagógica', plat: false },
  { t: 'Seguimiento', plat: true },
  { t: 'Mejoramiento', plat: false },
]

function Momentos() {
  return (
    <div>
      <div className="ruta-pasos" aria-label="Momentos de la ruta">
        {MOMENTOS.map((m, i) => (
          <span key={m.t} className={'ruta-momento' + (m.plat ? ' plat' : '')}>
            <b>{i + 1}</b>
            {m.t}
          </span>
        ))}
      </div>
      <p className="faint" style={{ marginTop: 6 }}>
        Los momentos resaltados salen de los resultados y la plataforma los acompaña; PFAP, intervención pedagógica y
        mejoramiento los desarrolla la institución con la Caja de Herramientas de la Guía Orientadora.{' '}
        <Link to="/documentos">Ver la Guía y los documentos →</Link>
      </p>
    </div>
  )
}

function Bloque({ n, titulo, pregunta, children }) {
  return (
    <div className="ruta-bloque">
      <div className="ruta-bloque-cab">
        <span className="ruta-circ">{n}</span>
        <div>
          <h3>{titulo}</h3>
          <span className="muted">{pregunta}</span>
        </div>
      </div>
      {children}
    </div>
  )
}

/** Cómo va un nodo entre la Aplicación 1 y la 2: valores, cambio y etiqueta de estado. */
function Progreso({ n }) {
  const e = estadoSeguimiento(n)
  return (
    <span className="ruta-progreso">
      <span className="ruta-vals">
        {n.a1 != null ? pct(n.a1) : 's/d'} → {n.a2 != null ? pct(n.a2) : 's/d'}
      </span>
      {n.delta != null && <Delta valor={n.delta * 100} modo="pts" />}
      <RangoTag rango={n.rango ?? n.rango1} />
      {e && <span className={'tag ' + e.tono}>{e.texto}</span>}
    </span>
  )
}

/**
 * Ruta de mejoramiento de QSQS de UNA institución, con la lógica de la Guía Orientadora: resultados
 * → análisis y priorización (evidencias Muy bajo y Bajo; dificultad común si varias evidencias de una
 * afirmación salen bajas) → seguimiento entre aplicaciones. `detalle` viene de useDetalleQsqs26.
 */
export function RutaQsqs({ modelo, detalle }) {
  const arbol = useMemo(() => arbolQsqs26(modelo.q26, detalle.filas), [modelo.q26, detalle.filas])
  const an = useMemo(() => analizarInstitucionQsqs(arbol.competencias), [arbol])
  const [verComunes, setVerComunes] = useState(false)
  const [verPuntuales, setVerPuntuales] = useState(false)

  const comunes = verComunes ? an.comunes : an.comunes.slice(0, 6)
  const puntuales = verPuntuales ? an.puntuales : an.puntuales.slice(0, 8)
  const pctBajas = an.totalEvidencias ? Math.round((an.enRangoBajo / an.totalEvidencias) * 100) : 0

  const descargar = () => {
    const { cols, filas } = filasAnexoA(arbol.competencias)
    exportarCsv('anexo-a-analisis-de-evidencias', cols, filas)
  }

  return (
    <section className="panel ficha-seccion" id="sec-ruta">
      <div className="panel-head">
        <h2>Ruta de mejoramiento — QSQS</h2>
        {an.tieneDetalle && (
          <button type="button" className="btn primary sm no-print" onClick={descargar}>
            ⬇ Descargar Anexo A (CSV)
          </button>
        )}
      </div>

      <Momentos />

      {detalle.estado === 'cargando' && !an.tieneDetalle && (
        <p className="muted">Cargando las afirmaciones y evidencias de esta institución…</p>
      )}

      {an.tieneDetalle ? (
        <>
          <Bloque n="1" titulo="Resultados" pregunta="¿Qué muestran los resultados?">
            <BarraRangos dist={an.evidencias} />
            <p className="muted">
              <strong>{fmtNum(an.totalEvidencias)}</strong> evidencias con resultado;{' '}
              <strong>{fmtNum(an.enRangoBajo)}</strong> ({pctBajas} %) en rango Muy bajo o Bajo. Se usa la Aplicación 2
              (y la 1 cuando la 2 no tiene dato).
            </p>
            <LeyendaRangos />
          </Bloque>

          <Bloque
            n="2 y 3"
            titulo="Análisis y priorización"
            pregunta="¿Qué aprendizajes requieren atención y cuáles primero?"
          >
            {an.comunes.length + an.puntuales.length === 0 ? (
              <div className="narrativa">
                Ninguna evidencia está en rango Muy bajo o Bajo. Buen momento para reconocer lo que está funcionando y
                sostenerlo.
              </div>
            ) : (
              <>
                {an.comunes.length > 0 && (
                  <>
                    <h4 className="ruta-sub">
                      Dificultades comunes <span className="muted">— varias evidencias bajas en una misma afirmación</span>
                    </h4>
                    <div className="ruta-lista">
                      {comunes.map(({ c, a, bajas, evaluadas }) => (
                        <details key={a.id} className="ruta-card">
                          <summary>
                            <div className="ruta-card-top">
                              <span className="tag neutral">
                                {c.area} · grado {c.grado}°
                              </span>
                              <span className="tag alert">
                                {bajas.length} de {evaluadas} evidencias bajas
                              </span>
                            </div>
                            <div className="ruta-card-txt">{a.texto}</div>
                            <div className="faint">Competencia: {c.texto}</div>
                            <div style={{ marginTop: 6 }}>
                              <Progreso n={a} />
                            </div>
                          </summary>
                          <div className="ruta-evs">
                            <div className="faint">Evidencias en rango bajo de esta afirmación:</div>
                            {bajas.map((e) => (
                              <div key={e.id} className="ruta-ev">
                                <div>{e.texto}</div>
                                <Progreso n={e} />
                              </div>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                    {an.comunes.length > 6 && (
                      <button type="button" className="btn ghost sm" onClick={() => setVerComunes(!verComunes)}>
                        {verComunes ? 'Ver menos' : `Ver las ${an.comunes.length}`}
                      </button>
                    )}
                  </>
                )}

                {an.puntuales.length > 0 && (
                  <>
                    <h4 className="ruta-sub">
                      Dificultades puntuales <span className="muted">— una sola evidencia baja en la afirmación</span>
                    </h4>
                    <div className="ruta-lista">
                      {puntuales.map(({ c, a, e }) => (
                        <div key={e.id} className="ruta-ev ruta-ev-caja">
                          <div>
                            {e.texto}
                            <div className="faint">
                              {c.area} · grado {c.grado}° · {a.texto}
                            </div>
                          </div>
                          <Progreso n={e} />
                        </div>
                      ))}
                    </div>
                    {an.puntuales.length > 8 && (
                      <button type="button" className="btn ghost sm" onClick={() => setVerPuntuales(!verPuntuales)}>
                        {verPuntuales ? 'Ver menos' : `Ver las ${an.puntuales.length}`}
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </Bloque>

          <Bloque n="6" titulo="Seguimiento" pregunta="¿Qué avances se observan entre la Aplicación 1 y la 2?">
            {an.seg.comparables > 0 ? (
              <>
                <KpiRow
                  items={[
                    { label: 'Evidencias bajas en la Aplicación 1', value: fmtNum(an.seg.bajasA1), sub: 'punto de partida' },
                    {
                      label: 'Salieron del rango bajo',
                      value: fmtNum(an.seg.superaron),
                      sub: 'ya no están en Muy bajo ni Bajo',
                      tono: 'ok',
                    },
                    { label: 'Siguen en rango bajo', value: fmtNum(an.seg.persisten), sub: 'requieren más acompañamiento', tono: 'warn' },
                    { label: 'Nuevas alertas', value: fmtNum(an.seg.nuevas), sub: 'no estaban bajas en la Aplicación 1', tono: 'alert' },
                  ]}
                />
                <p className="faint">
                  Se comparan las {fmtNum(an.seg.comparables)} evidencias con resultado en las dos aplicaciones. Cuando
                  llegue la Aplicación 3 se sumará al seguimiento.
                </p>
              </>
            ) : (
              <p className="muted">
                Todavía no hay evidencias con resultado en las dos aplicaciones para comparar.
              </p>
            )}
          </Bloque>
        </>
      ) : (
        detalle.estado !== 'cargando' && (
          <>
            {detalle.estado === 'error' && (
              <p className="muted">
                No se pudo cargar el detalle por afirmación y evidencia; por ahora se muestran las competencias.
              </p>
            )}
            {an.competenciasBajas.length > 0 ? (
              <div className="ruta-lista">
                {an.competenciasBajas.map((c) => (
                  <div key={c.id} className="ruta-ev ruta-ev-caja">
                    <div>
                      {c.texto}
                      <div className="faint">
                        {c.area} · grado {c.grado}°
                      </div>
                    </div>
                    <Progreso n={c} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Ninguna competencia está en rango Muy bajo o Bajo.</p>
            )}
          </>
        )
      )}
    </section>
  )
}

const dec = (v) => (v == null ? '' : (v * 100).toFixed(1).replace('.', ','))

/**
 * Ruta de mejoramiento de Saber 11 de UNA institución: los aprendizajes donde más estudiantes responden
 * mal frente a Colombia, agrupados por prueba (peor brecha primero).
 */
export function RutaSaber11({ inst }) {
  const [abiertas, setAbiertas] = useState({})
  const flojos = useMemo(() => aprendizajesFlojos([inst], { limite: 1000 }).filter((f) => f.gap < -0.02), [inst])
  const porArea = AREAS_S11.map((area) => ({ area, lista: flojos.filter((f) => f.area === area) })).filter(
    (g) => g.lista.length > 0,
  )
  const prioritarias = inst.areasPrioritarias ?? []

  const descargar = () => {
    exportarCsv(
      'saber11-aprendizajes-prioritarios',
      ['Prueba', 'Competencia', 'Aprendizaje', '% que responde mal (institución)', '% que responde mal (Colombia)', 'Diferencia (puntos porcentuales)'],
      flojos.map((f) => [f.area, f.competencia ?? '', f.aprendizaje, dec(f.ee), dec(f.col), dec(f.gap)]),
    )
  }

  return (
    <section className="panel ficha-seccion" id="sec-ruta">
      <div className="panel-head">
        <h2>Ruta de mejoramiento — Saber 11</h2>
        {flojos.length > 0 && (
          <button type="button" className="btn primary sm no-print" onClick={descargar}>
            ⬇ Descargar aprendizajes (CSV)
          </button>
        )}
      </div>

      <div className="narrativa">
        {inst.s11?.soloHistorico ? (
          <>De esta institución no se tiene el detalle de aprendizajes del ICFES, así que no se puede armar la ruta de Saber 11.</>
        ) : prioritarias.length > 0 ? (
          <>
            Frente a Colombia, esta institución está claramente por debajo en{' '}
            <strong>{prioritarias.join(', ')}</strong>. Estos son los aprendizajes donde más estudiantes responden mal,
            de la mayor a la menor brecha: llévalos al Comité de Área para contrastarlos con la planeación.
          </>
        ) : flojos.length > 0 ? (
          <>
            Ninguna prueba está claramente por debajo de Colombia, pero hay aprendizajes puntuales donde más estudiantes
            responden mal. Se ordenan de la mayor a la menor brecha.
          </>
        ) : (
          <>No hay aprendizajes por debajo de Colombia (más de 2 puntos). Buen momento para sostener lo que funciona.</>
        )}
      </div>

      {porArea.map(({ area, lista }) => {
        const abierta = !!abiertas[area]
        const mostradas = abierta ? lista : lista.slice(0, 5)
        return (
          <Bloque
            key={area}
            n={porArea.findIndex((g) => g.area === area) + 1}
            titulo={area}
            pregunta={`${lista.length} aprendizaje${lista.length === 1 ? '' : 's'} por debajo de Colombia`}
          >
            <div className="ruta-lista">
              {mostradas.map((f, i) => (
                <div key={i} className="ruta-ev ruta-ev-caja">
                  <div>
                    {f.aprendizaje}
                    {f.competencia && <div className="faint">{f.competencia}</div>}
                  </div>
                  <span className="ruta-progreso">
                    <span className="ruta-vals">
                      responde mal {pct(f.ee)} · Colombia {pct(f.col)}
                    </span>
                    <Delta valor={f.gap} modo="pct" />
                  </span>
                </div>
              ))}
            </div>
            {lista.length > 5 && (
              <button type="button" className="btn ghost sm" onClick={() => setAbiertas({ ...abiertas, [area]: !abierta })}>
                {abierta ? 'Ver menos' : `Ver los ${lista.length}`}
              </button>
            )}
          </Bloque>
        )
      })}

      <p className="faint">
        Los porcentajes son de <strong>error</strong> (estudiantes que responden mal): más bajo es mejor.{' '}
        <Link to="/documentos">Documentos de apoyo →</Link>
      </p>
    </section>
  )
}
