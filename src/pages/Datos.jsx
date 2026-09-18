import { useState } from 'react'
import PageHeader from '../components/layout/PageHeader.jsx'
import { PruebaToggle } from '../components/ui.jsx'
import { useModelo } from '../state/store.jsx'
import { fmtNum } from '../lib/format.js'
import { exportarCsv, filasInstitucionesCsv } from '../lib/exportar.js'

export default function Datos() {
  const { modelo } = useModelo()
  const [prueba, setPrueba] = useState('saber11')
  const conS11 = modelo.instituciones.filter((i) => i.tieneS11).length
  const conQ = modelo.instituciones.filter((i) => i.tieneQsqs).length
  const anio = modelo.periodo ? new Date(modelo.periodo).getFullYear() : '2025'
  const qsqsInfo = modelo.instituciones.find((i) => i.qsqs?.anio != null)?.qsqs

  return (
    <>
      <PageHeader titulo="Datos" crumbs={[{ to: '/', label: 'Panorama' }]} />
      <div className="content">
        <PruebaToggle value={prueba} onChange={setPrueba} />
        <section className="panel">
          <div className="panel-head">
            <h2>Estado de los datos — {prueba === 'saber11' ? 'Saber 11' : 'QSQS'}</h2>
          </div>
          <div className="table-wrap">
            <table className="data">
              <tbody>
                <tr>
                  <td className="cell-strong">Instituciones en el catálogo</td>
                  <td className="num">{fmtNum(modelo.instituciones.length)}</td>
                </tr>
                {prueba === 'saber11' ? (
                  <>
                    <tr>
                      <td className="cell-strong">Con resultados de Saber 11</td>
                      <td className="num">{fmtNum(conS11)}</td>
                    </tr>
                    <tr>
                      <td className="cell-strong">Aplicación cargada</td>
                      <td className="num">{anio}</td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <td className="cell-strong">Con resultados de QSQS</td>
                      <td className="num">{fmtNum(conQ)}</td>
                    </tr>
                    <tr>
                      <td className="cell-strong">Aplicación cargada</td>
                      <td className="num">
                        {qsqsInfo ? `Aplicación ${qsqsInfo.aplicacion} de ${qsqsInfo.anio}` : '—'}
                      </td>
                    </tr>
                  </>
                )}
                <tr>
                  <td className="cell-strong">Municipios</td>
                  <td className="num">{fmtNum(modelo.municipios.length)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Exportables</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="foco" style={{ borderLeftColor: 'var(--accent)' }}>
              <div className="foco-title">Consolidado de instituciones (Excel / CSV)</div>
              <div className="muted">
                DANE, municipio, zona, sector, puntaje global, banda, brecha vs Colombia, participación
                QSQS y pruebas por debajo — de las {fmtNum(modelo.instituciones.length)} instituciones del
                catálogo. Un solo archivo con ambas pruebas, pensado para análisis en hoja de cálculo.
              </div>
              <button
                type="button"
                className="btn primary sm"
                style={{ alignSelf: 'flex-start', marginTop: 6 }}
                onClick={() => {
                  const { cols, filas } = filasInstitucionesCsv(modelo.instituciones)
                  exportarCsv('plataforma-resultados-consolidado', cols, filas)
                }}
              >
                ⬇ Descargar CSV
              </button>
            </div>
            <div className="foco warn">
              <div className="foco-title">Informe por institución (PDF)</div>
              <div className="muted">
                Entrá a la ficha de cada institución y usá "Exportar informe" — abre el diálogo de
                impresión del navegador; elegí "Guardar como PDF".
              </div>
            </div>
            <p className="faint">
              Próximamente: informe consolidado por municipio y exportable de la ruta de mejoramiento.
            </p>
          </div>
        </section>
      </div>
    </>
  )
}
