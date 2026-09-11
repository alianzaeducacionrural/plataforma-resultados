import PageHeader from '../components/layout/PageHeader.jsx'
import { useModelo } from '../state/store.jsx'

export default function Historico() {
  const { modelo } = useModelo()
  const anio = modelo.periodo ? new Date(modelo.periodo).getFullYear() : '2025'
  return (
    <>
      <PageHeader titulo="Histórico" crumbs={[{ to: '/', label: 'Panorama' }]} />
      <div className="content">
        <section className="panel">
          <div className="panel-head">
            <h2>Evolución entre aplicaciones</h2>
          </div>
          <p className="muted">
            Por ahora hay una sola aplicación cargada ({anio}). Cuando entren más rondas (Saber 11
            2025 B, próximas aplicaciones de QSQS) esta sección mostrará la evolución del puntaje
            global y de cada área por institución, municipio y departamento.
          </p>
        </section>
      </div>
    </>
  )
}
