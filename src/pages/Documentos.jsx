import { useMemo } from 'react'
import PageHeader from '../components/layout/PageHeader.jsx'
import { useModelo } from '../state/store.jsx'
import { fmtNum } from '../lib/format.js'
import { resumenQsqsInstitucion } from '../lib/model.js'
import {
  exportarCsv,
  filasCompetenciasQsqs,
  filasHistoricoSaber11,
  filasInstitucionesCsv,
  filasInstitucionesQsqsCsv,
  filasNivelesSaber11,
} from '../lib/exportar.js'

// Sheets guarda "2026-01-07" como fecha real y la API la serializa como ISO
// completo ("2026-01-07T08:00:00.000Z") — acá solo interesa el día.
function fechaCorta(v) {
  if (!v) return ''
  const s = String(v)
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s
}

/**
 * Documentos y datos: los documentos de apoyo (circulares, guías, tableros externos,
 * carpetas de la SED — editables a mano en el Sheet "documentos", sin tocar código ni
 * redesplegar; ver Code.gs, ARCHIVOS_META), qué datos tiene cargados la plataforma
 * (calculado con lo que llegó del servidor, no escrito a mano) y las descargas.
 */
export default function Documentos() {
  const { modelo, q26Estado } = useModelo()
  const documentos = modelo.documentos ?? []

  const porCategoria = {}
  for (const d of documentos) {
    const cat = d['Categoría'] || 'General'
    ;(porCategoria[cat] = porCategoria[cat] || []).push(d)
  }
  const categorias = Object.keys(porCategoria).sort((a, b) => a.localeCompare(b, 'es'))

  return (
    <>
      <PageHeader titulo="Documentos y datos" crumbs={[{ to: '/', label: 'Panorama' }]} />
      <div className="content">
        {!documentos.length ? (
          <section className="panel">
            <p className="muted">Todavía no hay documentos cargados.</p>
          </section>
        ) : (
          categorias.map((cat) => (
            <section key={cat} className="panel">
              <div className="panel-head">
                <h2>{cat}</h2>
                <span className="muted">{porCategoria[cat].length}</span>
              </div>
              <div className="grid cols-2">
                {porCategoria[cat].map((d, i) => (
                  <a
                    key={i}
                    href={d['Enlace']}
                    target="_blank"
                    rel="noreferrer"
                    className="foco"
                    style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="foco-title">{d['Título'] || 'Documento'}</div>
                    {d['Descripción'] && <div className="muted">{d['Descripción']}</div>}
                    <div className="faint" style={{ marginTop: 4 }}>
                      {d['Fecha'] && <span>{fechaCorta(d['Fecha'])} · </span>}
                      Abrir ↗
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ))
        )}

        <DatosCargados modelo={modelo} q26Estado={q26Estado} />
        <Descargas modelo={modelo} />
      </div>
    </>
  )
}

/** Qué datos hay hoy en la plataforma, con las cifras reales del modelo cargado. */
function DatosCargados({ modelo, q26Estado }) {
  const r = useMemo(() => {
    const insts = modelo.instituciones
    const conS11 = insts.filter((i) => i.tieneS11)
    const conHist = insts.filter((i) => i.historico?.anios?.length)
    const aniosHist = [...new Set(conHist.flatMap((i) => i.historico.anios))].sort()
    const q = insts.map((i) => resumenQsqsInstitucion(i))
    return {
      total: insts.length,
      conS11: conS11.length,
      munS11: new Set(conS11.map((i) => i.municipio)).size,
      conHist: conHist.length,
      aniosHist,
      conClasif: conHist.filter((i) => i.clasificacionActual).length,
      conA1: q.filter((x) => x?.a1 != null).length,
      conA2: q.filter((x) => x?.a2 != null).length,
      conAmbas: q.filter((x) => x?.a1 != null && x?.a2 != null).length,
      competencias: modelo.q26
        ? [...modelo.q26.compIdsPorGrado.values()].reduce((a, ids) => a + ids.length, 0)
        : 0,
    }
  }, [modelo])

  const q26Cargando = q26Estado === 'cargando' || q26Estado === 'espera'
  const rangoHist = r.aniosHist.length
    ? r.aniosHist.length > 1
      ? `${r.aniosHist[0]}–${r.aniosHist[r.aniosHist.length - 1]}`
      : String(r.aniosHist[0])
    : null

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Datos disponibles</h2>
        <span className="muted">{fmtNum(r.total)} instituciones en el catálogo</span>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Conjunto de datos</th>
              <th>Cobertura</th>
              <th>Fuente</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="cell-strong">Saber 11{modelo.anioSaber11 ? ` — ${modelo.anioSaber11}` : ''}</td>
              <td>
                <strong>{fmtNum(r.conS11)}</strong> instituciones en {fmtNum(r.munS11)} municipios. Puntaje global,
                5 pruebas, niveles de desempeño y aprendizajes, con referencia de Colombia, Caldas y zonas.
              </td>
              <td>ICFES — resultados por establecimiento educativo.</td>
            </tr>
            <tr>
              <td className="cell-strong">Histórico Saber 11{rangoHist ? ` — ${rangoHist}` : ''}</td>
              <td>
                <strong>{fmtNum(r.conHist)}</strong> instituciones con serie por año; {fmtNum(r.conClasif)} con
                clasificación de planteles (A+, A, B, C, D).
              </td>
              <td>Base de resultados Saber 11 de la SED Caldas (la del tablero público de la Secretaría).</td>
            </tr>
            <tr>
              <td className="cell-strong">QSQS — 2026</td>
              <td>
                {q26Cargando ? (
                  <span className="muted">Cargando los resultados…</span>
                ) : modelo.q26?.disponible ? (
                  <>
                    Aplicación 1: <strong>{fmtNum(r.conA1)}</strong> instituciones · Aplicación 2:{' '}
                    <strong>{fmtNum(r.conA2)}</strong> · en ambas: <strong>{fmtNum(r.conAmbas)}</strong>. Grados 3°,
                    5°, 7° y 9°, {fmtNum(r.competencias)} competencias; el detalle por afirmación y evidencia se ve
                    en la ficha de cada institución.
                  </>
                ) : (
                  <span className="muted">Todavía no hay resultados de QSQS 2026 disponibles.</span>
                )}
              </td>
              <td>SED Caldas — reportes de resultados por institución de Quiero Ser Quiero Saber.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="faint" style={{ marginTop: 10 }}>
        Estas cifras se calculan con los datos que la plataforma tiene cargados en este momento; cuando se
        actualiza la información, cambian solas.
      </p>
    </section>
  )
}

/** Tarjeta de descarga. */
function Descarga({ titulo, texto, onClick, tono = 'accent' }) {
  return (
    <div className={'foco' + (tono === 'warn' ? ' warn' : '')} style={tono === 'accent' ? { borderLeftColor: 'var(--accent)' } : undefined}>
      <div className="foco-title">{titulo}</div>
      <div className="muted" style={{ flex: 1 }}>
        {texto}
      </div>
      {onClick && (
        <button type="button" className="btn primary sm" style={{ alignSelf: 'flex-start', marginTop: 6 }} onClick={onClick}>
          ⬇ Descargar CSV
        </button>
      )}
    </div>
  )
}

/**
 * Descargas: bases de datos en CSV (abren directo en Excel), armadas en el momento con los datos
 * que muestra la plataforma, y el informe por institución (PDF). Van todas las instituciones del
 * catálogo; los filtros de las otras pantallas no aplican acá.
 */
function Descargas({ modelo }) {
  const insts = modelo.instituciones
  const rango = (() => {
    const a = [...new Set(insts.flatMap((i) => i.historico?.anios ?? []))].sort()
    return a.length > 1 ? `${a[0]}–${a[a.length - 1]}` : String(a[0] ?? '')
  })()
  const anio = modelo.anioSaber11
  const bajar = (nombre, { cols, filas }) => exportarCsv(nombre, cols, filas)

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Descargas</h2>
        <span className="muted">CSV — se abren directo en Excel</span>
      </div>
      <h3 style={{ margin: '4px 0 10px', fontSize: 13 }}>Saber 11</h3>
      <div className="grid cols-3">
        <Descarga
          titulo={`Resultados y clasificación${rango ? ` ${rango}` : ''}`}
          texto="Una fila por institución: puntaje global, clasificación de planteles (A+, A, B, C, D) y puntaje de cada una de las 5 pruebas en cada año, con las referencias de Colombia y Caldas al final."
          onClick={() => bajar('saber11-resultados-y-clasificacion', filasHistoricoSaber11(insts, modelo.historicoRef))}
        />
        <Descarga
          titulo={`Niveles de desempeño por prueba${anio ? ` ${anio}` : ''}`}
          texto="Una fila por institución y prueba: promedio, referencias de Colombia y Caldas, diferencia y porcentaje de estudiantes en cada nivel de desempeño (con sus cortes de puntaje)."
          onClick={() => bajar('saber11-niveles-por-prueba', filasNivelesSaber11(insts))}
        />
        <Descarga
          titulo="Listado consolidado"
          texto="Puntaje global del último año, banda, diferencia con Colombia y pruebas por debajo de cada institución con resultados."
          onClick={() => bajar('saber11-instituciones', filasInstitucionesCsv(insts.filter((i) => i.tieneS11)))}
        />
      </div>
      <h3 style={{ margin: '18px 0 10px', fontSize: 13 }}>QSQS 2026</h3>
      <div className="grid cols-3">
        <Descarga
          titulo="Resultados por competencia"
          texto="Una fila por institución y competencia: grado, área, resultado de la Aplicación 1 y la 2, cambio, rango y referencias de Colombia y Caldas."
          onClick={() => bajar('qsqs-competencias', filasCompetenciasQsqs(insts))}
        />
        <Descarga
          titulo="Listado consolidado"
          texto="Resultado de la Aplicación 1 y la 2, cambio y rango de cada institución (promedio de sus competencias), más su participación."
          onClick={() =>
            bajar(
              'qsqs-instituciones',
              filasInstitucionesQsqsCsv(
                insts.filter((i) => i.tieneQsqs).map((i) => ({ ...i, q: resumenQsqsInstitucion(i) })),
              ),
            )
          }
        />
        <Descarga
          tono="warn"
          titulo="Informe por institución (PDF)"
          texto='Entra a la ficha de la institución y usa "Exportar informe": se abre el diálogo de impresión del navegador y eliges "Guardar como PDF".'
        />
      </div>
    </section>
  )
}
