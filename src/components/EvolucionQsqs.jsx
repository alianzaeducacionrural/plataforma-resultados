import { useMemo, useState } from 'react'
import EvolucionBarras from './charts/EvolucionBarras.jsx'
import { Delta, LeyendaRangos, RangoTag } from './ui.jsx'
import { pct } from '../lib/format.js'
import { AREAS_Q26, GRADOS_Q26, arbolQsqs26 } from '../lib/model.js'

const CLASE_NIVEL = { C: 'evo-comp', A: 'evo-af', E: 'evo-ev' }

const celda = (v) => (v == null ? <span className="faint">s/d</span> : pct(v))

/** Una fila (competencia, afirmación o evidencia); si tiene hijos, se despliega. */
function Nodo({ n, refKey }) {
  const refV = n.ref?.[refKey + '2']
  const gap = n.a2 != null && refV != null ? n.a2 - refV : null
  const hoja = !n.hijos.length
  const fila = (
    <div className={`evo-row ${CLASE_NIVEL[n.nivel]}${hoja ? ' evo-hoja' : ''}`}>
      <span className="evo-txt">{n.texto}</span>
      <span className="evo-num">{celda(n.a1)}</span>
      <span className="evo-num">{celda(n.a2)}</span>
      <span className="evo-num">
        <Delta valor={n.delta != null ? n.delta * 100 : null} modo="pts" />
      </span>
      <span className="evo-num">
        <RangoTag rango={n.rango} />
      </span>
      <span className="evo-num evo-ref">
        <Delta valor={gap != null ? gap * 100 : null} modo="pts" />
      </span>
    </div>
  )
  if (hoja) return fila
  return (
    <details className="evo">
      <summary>{fila}</summary>
      {n.hijos.map((h) => (
        <Nodo key={h.id} n={h} refKey={refKey} />
      ))}
    </details>
  )
}

/**
 * QSQS 2026 de UNA institución: cómo cambió entre la Aplicación 1 y la 2 en cada competencia,
 * con su detalle por afirmación y por evidencia. `detalle` = { estado, filas } (hook
 * useDetalleQsqs26): las competencias vienen con el panel; afirmaciones y evidencias, después.
 */
export default function EvolucionQsqs({ modelo, refSel, detalle }) {
  const refKey = refSel === 'ETC' ? 'etc' : 'col'
  const refNombre = refKey === 'etc' ? 'Caldas (ETC)' : 'Colombia'
  const arbol = useMemo(() => arbolQsqs26(modelo.q26, detalle.filas), [modelo.q26, detalle.filas])
  const grados = GRADOS_Q26.filter((g) => arbol.competencias.some((c) => c.grado === g))
  const [gradoSel, setGradoSel] = useState(null)
  const grado = grados.includes(gradoSel) ? gradoSel : grados[0]

  if (!grado) return <p className="muted">Esta institución no tiene resultados de QSQS 2026 cargados.</p>

  const comps = arbol.competencias.filter((c) => c.grado === grado)
  const sin = arbol.sinAplicacion[grado] || {}
  const cambios = comps.map((c) => c.delta).filter((d) => d != null)
  const cambioProm = cambios.length ? (cambios.reduce((a, b) => a + b, 0) / cambios.length) * 100 : null

  return (
    <>
      <div className="panel-head" style={{ marginTop: 6 }}>
        <h2>Evolución 2026 · Aplicación 1 → Aplicación 2</h2>
        <span className="muted">
          % de acierto · bajo cada grupo, el cambio de la Aplicación 1 a la 2 (la tabla compara con {refNombre})
        </span>
      </div>

      <div className="grado-tabs">
        {grados.map((g) => (
          <button key={g} type="button" className={g === grado ? 'active' : ''} onClick={() => setGradoSel(g)}>
            Grado {g}°
          </button>
        ))}
      </div>

      {(sin.a1 || sin.a2) && (
        <div className="narrativa" style={{ marginBottom: 10 }}>
          Sin resultados en la <strong>{sin.a1 && sin.a2 ? 'Aplicación 1 ni en la 2' : sin.a1 ? 'Aplicación 1' : 'Aplicación 2'}</strong>{' '}
          de este grado: todas sus competencias vienen en 0 %, lo que se interpreta como que no se presentó la
          prueba (no como un desempeño real), así que no se muestra como resultado.
        </div>
      )}
      {cambioProm != null && (
        <p className="muted" style={{ margin: '0 0 6px' }}>
          En el grado {grado}° el cambio promedio entre aplicaciones es{' '}
          <Delta valor={cambioProm} modo="pts" /> pts.
        </p>
      )}

      <EvolucionBarras
        filas={comps.map((c) => ({
          etiqueta: `${c.area}\n${c.texto}`,
          a1: c.a1,
          a2: c.a2,
        }))}
      />

      <div style={{ marginTop: 14 }}>
        <div className="evo-head">
          <span>Competencia · afirmación · evidencia</span>
          <span>Aplic. 1</span>
          <span>Aplic. 2</span>
          <span>Cambio</span>
          <span title="Rango de desempeño según la Aplicación 2">Rango</span>
          <span>vs {refKey === 'etc' ? 'Caldas' : 'Colombia'}</span>
        </div>
        {AREAS_Q26.map((area) => {
          const deArea = comps.filter((c) => c.area === area)
          if (!deArea.length) return null
          return (
            <div key={area}>
              <div className="faint" style={{ padding: '8px 10px 2px', fontWeight: 700 }}>
                {area}
              </div>
              {deArea.map((c) => (
                <Nodo key={c.id} n={c} refKey={refKey} />
              ))}
            </div>
          )
        })}
      </div>

      <LeyendaRangos />
      <p className="faint" style={{ marginTop: 6 }}>
        Haz clic en una competencia para ver sus afirmaciones y, dentro de cada una, sus evidencias. "Cambio" y
        "vs {refKey === 'etc' ? 'Caldas' : 'Colombia'}" están en puntos porcentuales; s/d = no evaluada.
        {detalle.estado === 'cargando' && ' Cargando afirmaciones y evidencias…'}
        {detalle.estado === 'error' && ' No se pudo cargar el detalle por afirmación y evidencia.'}
      </p>
    </>
  )
}
