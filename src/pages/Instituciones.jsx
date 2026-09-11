import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import FiltroGlobal from '../components/layout/FiltroGlobal.jsx'
import { Dot } from '../components/ui.jsx'
import { useFiltro, useModelo } from '../state/store.jsx'
import { fmtNum, pct } from '../lib/format.js'
import { bandaGlobal } from '../lib/model.js'
import { exportarCsv, filasInstitucionesCsv } from '../lib/exportar.js'

const COLS = [
  { key: 'nombre', label: 'Institución' },
  { key: 'municipio', label: 'Municipio' },
  { key: 'zonaSector', label: 'Zona · sector', noSort: true },
  { key: 'global', label: 'Puntaje Saber 11', num: true },
  { key: 'banda', label: 'Banda', noSort: true },
  { key: 'gapGlobalCol', label: 'vs Colombia', num: true },
  { key: 'participacionQsqs', label: 'Part. QSQS', num: true },
  { key: 'prioritarias', label: 'Áreas por debajo' },
]

export default function Instituciones() {
  const { modelo } = useModelo()
  const { aplicar } = useFiltro()
  const nav = useNavigate()
  const [sort, setSort] = useState({ field: 'nombre', dir: 'asc' })

  const filas = useMemo(() => {
    const list = aplicar(modelo.instituciones)
    const dir = sort.dir === 'asc' ? 1 : -1
    const numerico = ['global', 'gapGlobalCol', 'participacionQsqs'].includes(sort.field)
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
  }, [modelo, aplicar, sort])

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
            const { cols, filas: f } = filasInstitucionesCsv(filas)
            exportarCsv('instituciones', cols, f)
          }}
        >
          ⬇ Exportar CSV ({filas.length})
        </button>
      </PageHeader>
      <FiltroGlobal />
      <div className="content">
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
                  {COLS.map((c) => (
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
                {filas.map((d) => {
                  const b = bandaGlobal(d.global)
                  return (
                    <tr key={d.dane} className="clickable" onClick={() => nav(`/instituciones/${d.dane}`)}>
                      <td>
                        <div className="cell-stack">
                          <span className="cell-strong">{d.nombre}</span>
                          <span className="cell-sub">DANE {d.dane}</span>
                        </div>
                      </td>
                      <td>{d.municipio}</td>
                      <td>{[d.zona, d.sector].filter(Boolean).join(' · ') || '—'}</td>
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
                      <td className="num">{d.participacionQsqs != null ? pct(d.participacionQsqs) : '—'}</td>
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
                    </tr>
                  )
                })}
                {!filas.length && (
                  <tr>
                    <td colSpan={COLS.length} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                      Ninguna institución coincide con el filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <p className="faint">
          "vs Colombia" = diferencia del puntaje global frente al promedio nacional. "Áreas por debajo" =
          áreas de Saber 11 donde la institución está claramente bajo el promedio nacional.{' '}
          <Link to="/comparador">Comparar instituciones →</Link>
        </p>
      </div>
    </>
  )
}

function valNum(d, field) {
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
