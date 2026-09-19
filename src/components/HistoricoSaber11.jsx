import LineHistorico from './charts/LineHistorico.jsx'
import { Delta } from './ui.jsx'
import { fmtNum } from '../lib/format.js'
import { AREAS_S11 } from '../lib/model.js'
import { COLOR_CATEGORIA } from '../lib/paleta.js'

const COLOR_INST = '#0aa596'
const COLOR_CALDAS = '#f5a300'
const COLOR_COLOMBIA = '#0f3d4c'

/** Serie de la institución + las dos referencias (Caldas y Colombia, punteadas). */
const series = (datos, dep, col) => [
  { key: 'inst', label: 'Esta institución', color: COLOR_INST, data: datos || {} },
  { key: 'dep', label: 'Caldas', color: COLOR_CALDAS, dashed: true, data: dep || {} },
  { key: 'col', label: 'Colombia', color: COLOR_COLOMBIA, dashed: true, data: col || {} },
]

const primeroYUltimo = (datos, anios) => {
  const con = anios.filter((a) => datos?.[a] != null)
  return con.length ? { a0: con[0], a1: con[con.length - 1], v0: datos[con[0]], v1: datos[con[con.length - 1]] } : null
}

/**
 * Evolución de Saber 11 de UNA institución por año (puntaje global, cada prueba y clasificación),
 * comparada con Caldas y Colombia. Solo muestra lo que hay: sin histórico no dibuja nada, y las
 * pruebas o años sin dato se omiten.
 */
export default function HistoricoSaber11({ inst, modelo }) {
  const h = inst.historico
  if (!h?.anios?.length) return null
  const anios = [...h.anios].sort((a, b) => a - b)
  const refCol = modelo.historicoRef?.colombia || {}
  const refDep = modelo.historicoRef?.departamento || {}
  const rango = anios.length > 1 ? `${anios[0]}–${anios[anios.length - 1]}` : String(anios[0])
  const variasAnios = anios.length > 1

  const global = primeroYUltimo(h.global, anios)
  const globalCol = primeroYUltimo(refCol.Global, anios)
  const conClasif = anios.filter((a) => h.clasificacion?.[a])

  const filas = [
    { nombre: 'Puntaje global', datos: h.global, dep: refDep.Global, col: refCol.Global, dec: 0 },
    ...AREAS_S11.filter((area) => Object.keys(h.areas?.[area] ?? {}).length > 0).map((area) => ({
      nombre: area,
      datos: h.areas[area],
      dep: refDep[area],
      col: refCol[area],
      dec: 1,
    })),
  ].filter((f) => Object.keys(f.datos ?? {}).length > 0)
  const areasConDato = filas.filter((f) => f.nombre !== 'Puntaje global')
  const ultimo = anios[anios.length - 1]

  return (
    <>
      <section className="panel ficha-seccion" id="evolucion">
        <div className="panel-head">
          <h2>Evolución del puntaje global · {rango}</h2>
          <span className="muted">frente a Caldas y Colombia</span>
        </div>

        {global && global.a0 !== global.a1 && (
          <div className="narrativa">
            Entre {global.a0} y {global.a1} el puntaje global pasó de <strong>{fmtNum(global.v0)}</strong> a{' '}
            <strong>{fmtNum(global.v1)}</strong> (<Delta valor={global.v1 - global.v0} modo="pts" digits={0} /> pts)
            {globalCol && globalCol.a0 !== globalCol.a1 && (
              <>
                ; en Colombia pasó de {fmtNum(globalCol.v0)} a {fmtNum(globalCol.v1)}
              </>
            )}
            .
          </div>
        )}

        {conClasif.length > 0 && (
          <div>
            <div className="muted" style={{ marginBottom: 6 }}>
              Clasificación de planteles (ICFES)
            </div>
            <div className="clasif-fila">
              {conClasif.map((a) => (
                <span key={a} className="clasif-chip" style={{ '--k': COLOR_CATEGORIA[h.clasificacion[a]] || '#86989d' }}>
                  <span className="clasif-anio">{a}</span>
                  <strong>{h.clasificacion[a]}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {variasAnios && Object.keys(h.global ?? {}).length > 0 && (
          <LineHistorico anios={anios} series={series(h.global, refDep.Global, refCol.Global)} />
        )}
      </section>

      {areasConDato.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>Evolución por prueba · {rango}</h2>
            <span className="muted">puntaje de 0 a 100</span>
          </div>

          {variasAnios && (
            <div className="grid cols-2">
              {areasConDato.map((f) => (
                <div key={f.nombre}>
                  <h3 style={{ margin: '0 0 4px' }}>{f.nombre}</h3>
                  <LineHistorico anios={anios} series={series(f.datos, f.dep, f.col)} decimales={1} />
                </div>
              ))}
            </div>
          )}

          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Prueba</th>
                  {anios.map((a) => (
                    <th key={a} className="num">
                      {a}
                    </th>
                  ))}
                  {variasAnios && <th className="num">Cambio</th>}
                  <th className="num">Caldas {ultimo}</th>
                  <th className="num">Colombia {ultimo}</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => {
                  const pu = primeroYUltimo(f.datos, anios)
                  return (
                    <tr key={f.nombre}>
                      <td className="cell-strong">{f.nombre}</td>
                      {anios.map((a) => (
                        <td key={a} className="num">
                          {f.datos?.[a] != null ? fmtNum(f.datos[a], f.dec) : '—'}
                        </td>
                      ))}
                      {variasAnios && (
                        <td className="num">
                          {pu && pu.a0 !== pu.a1 ? <Delta valor={pu.v1 - pu.v0} modo="pts" digits={f.dec} /> : '—'}
                        </td>
                      )}
                      <td className="num">{f.dep?.[ultimo] != null ? fmtNum(f.dep[ultimo], f.dec) : '—'}</td>
                      <td className="num">{f.col?.[ultimo] != null ? fmtNum(f.col[ultimo], f.dec) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="faint">
            Fuente: base histórica de resultados Saber 11 de la Secretaría de Educación de Caldas. "Cambio" = último
            año con dato menos el primero.
          </p>
        </section>
      )}
    </>
  )
}
