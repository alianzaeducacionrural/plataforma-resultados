import PageHeader from '../components/layout/PageHeader.jsx'
import { useModelo } from '../state/store.jsx'

// Sheets guarda "2026-01-07" como fecha real y la API la serializa como ISO
// completo ("2026-01-07T08:00:00.000Z") — acá solo interesa el día.
function fechaCorta(v) {
  if (!v) return ''
  const s = String(v)
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s
}

/**
 * Lista de documentos de apoyo (circulares, guías, tableros externos),
 * editable a mano en el Sheet "documentos" (Categoría, Título, Descripción,
 * Enlace, Fecha) — sin tocar código ni redesplegar. Ver Code.gs (ARCHIVOS_META).
 */
export default function Documentos() {
  const { modelo } = useModelo()
  const documentos = modelo.documentos ?? []

  const porCategoria = {}
  for (const d of documentos) {
    const cat = d['Categoría'] || 'General'
    ;(porCategoria[cat] = porCategoria[cat] || []).push(d)
  }
  const categorias = Object.keys(porCategoria).sort((a, b) => a.localeCompare(b, 'es'))

  return (
    <>
      <PageHeader titulo="Documentos" crumbs={[{ to: '/', label: 'Panorama' }]} />
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
      </div>
    </>
  )
}
