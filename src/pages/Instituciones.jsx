import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import FiltroGlobal from '../components/layout/FiltroGlobal.jsx'
import { CargandoQsqs } from '../components/Estado.jsx'
import { Delta, Dot, LeyendaRangos, PruebaToggle, RangoTag } from '../components/ui.jsx'
import { useFiltro, useModelo } from '../state/store.jsx'
import { fmtNum, pct } from '../lib/format.js'
import { AREAS_Q26, bandaGlobal, resumenQsqsInstitucion } from '../lib/model.js'
import { exportarCsv, filasInstitucionesCsv, filasInstitucionesQsqsCsv } from '../lib/exportar.js'

const colsS11 = (anio) => [
  { key: 'nombre', label: 'Institución' },
  { key: 'global', label: anio ? `Puntaje ${anio}` : 'Puntaje Saber 11', num: true },
  { key: 'banda', label: 'Banda', noSort: true },
  { key: 'clasificacionActual', label: 'Clasificación' },
  { key: 'gapGlobalCol', label: 'vs Colombia', num: true },
  { key: 'prioritarias', label: 'Pruebas por debajo' },
]

const COLS_QSQS = [
  { key: 'nombre', label: 'Institución' },
  { key: 'q1', label: 'Aplicación 1', num: true },
  { key: 'q2', label: 'Aplicación 2', num: true },
  { key: 'qcambio', label: 'Cambio', num: true },
  { key: 'qrango', label: 'Rango' },
  { key: 'gradosEvaluados', label: 'Grados evaluados', num: true },
]

// Orden del rango QSQS (Muy bajo = 0 … Alto = 3) para poder ordenar esa columna.
const RANGO_ORDEN = { 'Muy bajo': 0, Bajo: 1, Medio: 2, Alto: 3 }

// Orden de mejor a peor, para poder ordenar la columna de clasificación.
const CLASIF_RANK = { 'A+': 0, A: 1, B: 2, C: 3, D: 4 }
const COLOR_CLASIF = { 'A+': 'ok', A: 'ok', B: 'ok', C: 'warn', D: 'alert' }

export default function Instituciones() {
  const { modelo, q26Estado } = useModelo()
  const { aplicar } = useFiltro()
  const nav = useNavigate()
  const [prueba, setPrueba] = useState('saber11')
  const [areaQ, setAreaQ] = useState('') // '' = todas las áreas de QSQS
  const q26Cargando = q26Estado === 'cargando' || q26Estado === 'espera'
  const [sort, setSort] = useState({ field: 'nombre', dir: 'asc' })
  const cols = prueba === 'saber11' ? colsS11(modelo.anioSaber11) : COLS_QSQS

  const filas = useMemo(() => {
    // Cada pestaña muestra solo instituciones con datos de esa prueba —
    // nada de filas con guiones por no tener QSQS (o Saber 11).
    const list = aplicar(modelo.instituciones)
      .filter((d) => (prueba === 'saber11' ? d.tieneS11 : d.tieneQsqs))
      .map((d) => (prueba === 'qsqs' ? { ...d, q: resumenQsqsInstitucion(d, areaQ || null) } : d))
    const dir = sort.dir === 'asc' ? 1 : -1
    const numerico = [
      'global',
      'gapGlobalCol',
      'clasificacionActual',
      'gradosEvaluados',
      'q1',
      'q2',
      'qcambio',
      'qrango',
    ].includes(sort.field)
    return [...list].sort((a, b) => {
      if (numerico) {
        // sin dato siempre al final
        const av = valNum(a, sort.field)
        const bv = valNum(b, sort.field)
        if (av == null && bv == null) return a.nombre.localeCompare(b.nombre, 'es')
        if (av == null) return 1
        if (bv == null) return -1
        return dir * (av - bv) || a.nombre.localeCompare(b.nombre, 'es')
      }
      return dir * cmp(a, b, sort.field)
    })
  }, [modelo, aplicar, sort, prueba, areaQ])

  const toggleSort = (field) =>
    setSort((s) =>
      s.field === field
        ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: field === 'nombre' || field === 'municipio' ? 'asc' : 'desc' },
    )

  return (
    <>
      <PageHeader titulo="Instituciones">
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => {
            const { cols: c, filas: f } = prueba === 'qsqs' ? filasInstitucionesQsqsCsv(filas) : filasInstitucionesCsv(filas)
            exportarCsv(prueba === 'qsqs' ? 'instituciones-qsqs' : 'instituciones', c, f)
          }}
        >
          ⬇ Exportar CSV ({filas.length})
        </button>
      </PageHeader>
      <FiltroGlobal>
        {prueba === 'qsqs' && (
          <div className="field field-area">
            <label htmlFor="fg-area-q">Área</label>
            <select id="fg-area-q" value={areaQ} onChange={(e) => setAreaQ(e.target.value)}>
              <option value="">Todas</option>
              {AREAS_Q26.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        )}
      </FiltroGlobal>
      <div className="content">
        <PruebaToggle
          value={prueba}
          onChange={(p) => {
            setPrueba(p)
            setSort({ field: 'nombre', dir: 'asc' })
          }}
        />
        {prueba === 'qsqs' && q26Cargando && <CargandoQsqs />}
        <section className="panel">
          <div className="panel-head">
            <h2>
              {filas.length} institucion{filas.length === 1 ? '' : 'es'}
            </h2>
            <span className="muted">Click en una fila para ver la ficha completa</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th
                      key={c.key}
                      className={(c.noSort ? '' : 'sortable ') + (c.num ? 'num' : '')}
                      onClick={c.noSort ? undefined : () => toggleSort(c.key)}
                    >
                      {c.label}
                      {!c.noSort && sort.field === c.key && (
                        <span className="sort-arrow">{sort.dir === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((d) => (
                  <tr key={d.dane} className="clickable" onClick={() => nav(`/instituciones/${d.dane}`)}>
                    <td>
                      <div className="cell-stack" title={`DANE ${d.dane}`}>
                        <span className="cell-strong">{d.nombre}</span>
                        <span className="cell-sub">{[d.municipio, d.zona, d.sector].filter(Boolean).join(' · ')}</span>
                      </div>
                    </td>
                    {prueba === 'saber11' ? (
                      <FilaSaber11 d={d} />
                    ) : (
                      <FilaQsqs d={d} />
                    )}
                  </tr>
                ))}
                {!filas.length && (
                  <tr>
                    <td colSpan={cols.length} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                      Ninguna institución coincide con el filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <p className="faint">
          {prueba === 'saber11' ? (
            <>
              "vs Colombia" = diferencia del puntaje global frente al promedio nacional. "Pruebas por debajo" =
              pruebas de Saber 11 donde la institución está claramente bajo el promedio nacional.{' '}
            </>
          ) : (
            <>
              Aplicación 1 y 2 = promedio de aciertos en las competencias de la institución (solo las evaluadas en
              ambas aplicaciones); "Cambio" = Aplicación 2 − Aplicación 1; "Rango" corresponde a la Aplicación 2 (o a la 1 si aún no hay 2).{' '}
            </>
          )}
          <Link to="/comparador">Comparar instituciones →</Link>
        </p>
        {prueba === 'qsqs' && <LeyendaRangos />}
      </div>
    </>
  )
}

function FilaSaber11({ d }) {
  const b = bandaGlobal(d.global)
  return (
    <>
      <td className="num">{d.global != null ? fmtNum(d.global) : '—'}</td>
      <td>
        {b ? (
          <span className={'tag ' + b.clase}>
            <Dot estado={b.clase} />
            {b.nombre}
          </span>
        ) : (
          <span className="faint">s/d</span>
        )}
      </td>
      <td>
        {d.clasificacionActual ? (
          <span className={'tag ' + (COLOR_CLASIF[d.clasificacionActual] || 'neutral')}>
            <Dot estado={COLOR_CLASIF[d.clasificacionActual] || 'na'} />
            {d.clasificacionActual}
          </span>
        ) : (
          <span className="faint">s/d</span>
        )}
      </td>
      <td className="num">
        {d.gapGlobalCol != null ? (
          <span className={'delta ' + (d.gapGlobalCol >= 0 ? 'up' : 'down')}>
            {d.gapGlobalCol >= 0 ? '+' : '−'}
            {fmtNum(Math.abs(d.gapGlobalCol), 1)}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td>
        {!d.tieneS11 ? (
          <span className="faint">s/d</span>
        ) : d.areasPrioritarias.length ? (
          <span className="tag alert" title={d.areasPrioritarias.join(' · ')}>
            <Dot estado="alert" />
            {d.areasPrioritarias.length}
          </span>
        ) : (
          <span className="tag ok">
            <Dot estado="ok" />0
          </span>
        )}
      </td>
    </>
  )
}

function FilaQsqs({ d }) {
  const q = d.q
  return (
    <>
      <td className="num">{q?.a1 != null ? pct(q.a1) : '—'}</td>
      <td className="num">{q?.a2 != null ? pct(q.a2) : '—'}</td>
      <td className="num">{q?.cambio != null ? <Delta valor={q.cambio} modo="pct" /> : '—'}</td>
      <td>
        {q?.rango ? (
          <>
            <RangoTag rango={q.rango} />
            {!q.enA2 && (
              <span className="faint" title="Todavía no tiene resultados de la Aplicación 2">
                {' '}
                · Aplic. 1
              </span>
            )}
          </>
        ) : (
          <span className="faint">s/d</span>
        )}
      </td>
      <td className="num">{q ? fmtNum(q.grados) : '—'}</td>
    </>
  )
}

function valNum(d, field) {
  if (field === 'clasificacionActual') {
    const r = CLASIF_RANK[d.clasificacionActual]
    return r == null ? null : 4 - r // A+ = 4 (mejor) ... D = 0, mismo sentido que "más alto = mejor"
  }
  if (field === 'gradosEvaluados') return d.q?.grados ?? null
  if (field === 'q1') return d.q?.a1 ?? null
  if (field === 'q2') return d.q?.a2 ?? null
  if (field === 'qcambio') return d.q?.cambio ?? null
  if (field === 'qrango') return d.q?.rango ? RANGO_ORDEN[d.q.rango.nombre] : null
  return d[field] ?? null
}
function cmp(a, b, field) {
  switch (field) {
    case 'nombre':
      return a.nombre.localeCompare(b.nombre, 'es')
    case 'municipio':
      return a.municipio.localeCompare(b.municipio, 'es') || a.nombre.localeCompare(b.nombre, 'es')
    case 'prioritarias':
      return (a.areasPrioritarias?.length ?? -1) - (b.areasPrioritarias?.length ?? -1)
    default:
      return 0
  }
}
