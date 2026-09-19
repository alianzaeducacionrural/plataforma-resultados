import { useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import FiltroGlobal from '../components/layout/FiltroGlobal.jsx'
import LineHistorico from '../components/charts/LineHistorico.jsx'
import { CargandoQsqs } from '../components/Estado.jsx'
import { Delta, PruebaToggle } from '../components/ui.jsx'
import { useFiltro, useModelo } from '../state/store.jsx'
import { fmtNum } from '../lib/format.js'
import { COLOR_CATEGORIA } from '../lib/paleta.js'
import {
  AREAS_Q26,
  GRADOS_Q26,
  competenciasEvolucionQsqs,
  evolucionAreasQsqs,
  historicoGlobalPromedio,
} from '../lib/model.js'


/**
 * Histórico DEPARTAMENTAL. La evolución de cada institución vive en su propia ficha
 * (`/instituciones/:dane`), así que un enlace viejo con `?dane=` redirige allá.
 */
export default function Historico() {
  const { modelo } = useModelo()
  const { aplicar } = useFiltro()
  const [params] = useSearchParams()
  const dane = params.get('dane')
  const [prueba, setPrueba] = useState('saber11')

  if (dane) return <Navigate to={`/instituciones/${dane}`} replace />

  if (prueba === 'qsqs') {
    return <HistoricoQsqs modelo={modelo} aplicar={aplicar} prueba={prueba} setPrueba={setPrueba} />
  }
  return <HistoricoDepartamento modelo={modelo} aplicar={aplicar} prueba={prueba} setPrueba={setPrueba} />
}

function HistoricoDepartamento({ modelo, aplicar, prueba, setPrueba }) {
  const lista = useMemo(() => aplicar(modelo.instituciones, { ignorarBusqueda: true }), [modelo, aplicar])
  const agregados = useMemo(() => historicoGlobalPromedio(lista), [lista])
  const anios = agregados.map((a) => a.anio)
  const refCol = modelo.historicoRef?.colombia?.Global || {}
  const refDep = modelo.historicoRef?.departamento?.Global || {}

  const series = [
    {
      key: 'prom',
      label: 'Promedio (filtro actual)',
      color: '#0aa596',
      data: Object.fromEntries(agregados.map((a) => [a.anio, a.prom != null ? Math.round(a.prom) : null])),
    },
    { key: 'dep', label: 'Caldas', color: '#f5a300', dashed: true, data: refDep },
    { key: 'col', label: 'Colombia', color: '#0f3d4c', dashed: true, data: refCol },
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
        <PruebaToggle value={prueba} onChange={setPrueba} />
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
                    <div key={cat} className="kpi cat" style={{ '--k': COLOR_CATEGORIA[cat] }}>
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
              Fuente: histórico departamental de Saber 11 (Secretaría de Educación de Caldas). Para ver una institución
              en particular, entra a su ficha.
            </p>
          </>
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------
// QSQS: como hoy hay dos aplicaciones en 2026, el "histórico" es Aplicación 1 → Aplicación 2.

const APLICACIONES = ['Aplicación 1', 'Aplicación 2']
const puntos = (v) => (v == null ? null : Math.round(v * 1000) / 10) // fracción → % con 1 decimal

function HistoricoQsqs({ modelo, aplicar, prueba, setPrueba }) {
  const { q26Estado } = useModelo()
  const q26Cargando = q26Estado === 'cargando' || q26Estado === 'espera'
  const [grado, setGrado] = useState('5')
  const lista = useMemo(() => aplicar(modelo.instituciones, { ignorarBusqueda: true }), [modelo, aplicar])

  return (
    <>
      <PageHeader titulo="Histórico" />
      <FiltroGlobal conBusqueda={false} />
      <div className="content">
        <PruebaToggle value={prueba} onChange={setPrueba} />
        {q26Cargando ? (
          <CargandoQsqs />
        ) : !modelo.q26?.disponible ? (
          <section className="panel">
            <p className="muted">
              Todavía no hay resultados de QSQS 2026 cargados, así que no se puede mostrar la evolución entre
              aplicaciones.
            </p>
          </section>
        ) : (
          <>
            <div className="grado-tabs">
              {GRADOS_Q26.map((g) => (
                <button key={g} type="button" className={g === grado ? 'active' : ''} onClick={() => setGrado(g)}>
                  Grado {g}°
                </button>
              ))}
            </div>
            <QsqsDepartamento lista={lista} grado={grado} />
            <p className="faint">
              Por ahora QSQS tiene dos aplicaciones en 2026; cuando entren más, esta sección seguirá sumando
              puntos a la línea. % de acierto en todos los casos. Para ver una institución en particular, entra a su
              ficha.
            </p>
          </>
        )}
      </div>
    </>
  )
}

function QsqsDepartamento({ lista, grado }) {
  const evo = useMemo(() => evolucionAreasQsqs(lista), [lista])
  const comps = useMemo(() => competenciasEvolucionQsqs(lista), [lista])
  const conCambio = comps.filter((c) => c.cambio != null)
  const mejoran = [...conCambio].filter((c) => c.cambio > 0).sort((a, b) => b.cambio - a.cambio).slice(0, 5)
  const caen = [...conCambio].filter((c) => c.cambio < 0).sort((a, b) => a.cambio - b.cambio).slice(0, 5)

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>Grado {grado}° — evolución por área</h2>
          <span className="muted">promedio del conjunto filtrado vs Caldas y Colombia</span>
        </div>
        <div className="grid cols-2">
          {AREAS_Q26.map((area) => {
            const g = evo.find((a) => a.area === area)?.grados.find((x) => x.grado === grado)
            if (!g || (g.a1 == null && g.a2 == null)) return null
            const series = [
              { key: 'prom', label: 'Promedio (filtro actual)', color: '#0aa596', data: { [APLICACIONES[0]]: puntos(g.a1), [APLICACIONES[1]]: puntos(g.a2) } },
              { key: 'etc', label: 'Caldas', color: '#f5a300', dashed: true, data: { [APLICACIONES[0]]: puntos(g.etc1), [APLICACIONES[1]]: puntos(g.etc2) } },
              { key: 'col', label: 'Colombia', color: '#0f3d4c', dashed: true, data: { [APLICACIONES[0]]: puntos(g.col1), [APLICACIONES[1]]: puntos(g.col2) } },
            ]
            return (
              <div key={area}>
                <h3 style={{ margin: '0 0 4px' }}>{area}</h3>
                <LineHistorico anios={APLICACIONES} series={series} decimales={1} unidad=" %" />
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Competencias que más cambiaron</h2>
          <span className="muted">todos los grados · Aplicación 1 → Aplicación 2</span>
        </div>
        <div className="grid cols-2">
          <TablaMovimientos titulo="Más mejoraron" filas={mejoran} />
          <TablaMovimientos titulo="Más cayeron" filas={caen} />
        </div>
      </section>
    </>
  )
}

function TablaMovimientos({ titulo, filas }) {
  return (
    <div>
      <h3 style={{ margin: '0 0 6px' }}>{titulo}</h3>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Competencia</th>
              <th className="num">Aplic. 1</th>
              <th className="num">Aplic. 2</th>
              <th className="num">Cambio</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.competencia}
                  <div className="faint">
                    {c.area} · grado {c.grado}°
                  </div>
                </td>
                <td className="num">{fmtNum(puntos(c.a1), 1)} %</td>
                <td className="num">{fmtNum(puntos(c.a2), 1)} %</td>
                <td className="num">
                  <Delta valor={c.cambio * 100} modo="pts" />
                </td>
              </tr>
            ))}
            {!filas.length && (
              <tr>
                <td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 14 }}>
                  Ninguna en este grupo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
