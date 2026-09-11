import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import FiltroGlobal from '../components/layout/FiltroGlobal.jsx'
import { Delta, PruebaToggle } from '../components/ui.jsx'
import { useFiltro, useModelo } from '../state/store.jsx'
import { pct } from '../lib/format.js'
import { PESO_AREA } from '../data/saber11.js'
import { aprendizajesFlojos, competenciasQsqs, media } from '../lib/model.js'
import { imprimir } from '../lib/exportar.js'

export default function RutaMejoramiento() {
  const { modelo } = useModelo()
  const { aplicar } = useFiltro()
  const [params] = useSearchParams()
  const [prueba, setPrueba] = useState('saber11')
  const dane = params.get('dane')
  const inst = dane ? modelo.instituciones.find((i) => i.dane === dane) : null

  const lista = useMemo(
    () => (inst ? [inst] : aplicar(modelo.instituciones, { ignorarBusqueda: true })),
    [modelo, aplicar, inst],
  )

  // --- prioridades Saber 11 (aprendizajes por debajo de Colombia) ---
  const s11 = useMemo(() => {
    const flojos = aprendizajesFlojos(lista, { limite: 200 }).filter((f) => f.gap < -0.02)
    return flojos
      .map((f) => ({ ...f, score: -f.gap * (PESO_AREA[f.area] || 1) * Math.max(1, f.n) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
  }, [lista])

  // --- prioridades QSQS (competencias por debajo de Colombia) ---
  const qsqs = useMemo(() => {
    const by = new Map()
    for (const i of lista) {
      for (const c of competenciasQsqs(i)) {
        if (c.ee == null || c.colombia == null) continue
        const k = c.area + ' ‖ ' + c.grado + ' ‖ ' + c.competencia
        if (!by.has(k)) by.set(k, { ...c, ee: [], col: [] })
        by.get(k).ee.push(c.ee)
        by.get(k).col.push(c.colombia)
      }
    }
    return [...by.values()]
      .map((c) => {
        const ee = media(c.ee)
        const col = media(c.col)
        return { ...c, ee, col, gap: ee - col }
      })
      .filter((c) => c.gap < -0.02)
      .sort((a, b) => a.gap - b.gap)
      .slice(0, 8)
  }, [lista])

  const titulo = inst ? `Ruta de mejoramiento — ${inst.nombre}` : 'Ruta de mejoramiento — departamento'

  return (
    <>
      <PageHeader
        titulo={titulo}
        crumbs={inst ? [{ to: `/instituciones/${inst.dane}`, label: inst.nombre }] : [{ to: '/', label: 'Panorama' }]}
      >
        <button type="button" className="btn ghost sm no-print" onClick={imprimir}>
          ⬇ Exportar (PDF)
        </button>
      </PageHeader>
      {!inst && <FiltroGlobal conBusqueda={false} />}

      <div className="content">
        <PruebaToggle value={prueba} onChange={setPrueba} />
        <div className="narrativa">
          Focos ordenados por <strong>impacto</strong> = brecha frente a Colombia × peso del área ×
          alcance. Empezá por arriba.
        </div>

        {prueba === 'saber11' ? (
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
                    <Delta valor={f.gap} modo="pct" />
                    {!inst && ` · ${f.n} instituciones`}
                  </div>
                  <div className="faint">
                    Qué reforzar: prácticas y retroalimentación centradas en este aprendizaje;{' '}
                    <Link to={`/areas?area=${encodeURIComponent(f.area)}`}>ver el área completa →</Link>
                  </div>
                </li>
              ))}
              {!s11.length && <li className="muted">Sin brechas relevantes en Saber 11 para este alcance.</li>}
            </ol>
          </section>
        ) : (
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
                  </div>
                </li>
              ))}
              {!qsqs.length && <li className="muted">Sin brechas relevantes en QSQS para este alcance.</li>}
            </ol>
          </section>
        )}

        <p className="faint">Próximamente: seguimiento de esta ruta entre aplicaciones.</p>
      </div>
    </>
  )
}
