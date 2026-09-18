import { useEffect, useState } from 'react'

const ETAPAS = ['QSQS', 'Saber 11', 'Instituciones', 'Histórico']

function PasoIcono({ estado }) {
  if (estado === 'hecho') {
    return (
      <svg className="loader-punto hecho" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="var(--accent)" />
        <path d="M8 12.5l2.5 2.5L16 9.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return <span className={'loader-punto' + (estado === 'activo' ? ' activo' : '')} />
}

/** Pantalla de carga inicial: no es un spinner mudo — muestra en qué paso va
 * (QSQS → Saber 11 → Instituciones → Histórico) con mensajes para la persona
 * que lo usa, no para quien programó esto. */
export function Cargando({ progreso }) {
  const { mensaje = 'Cargando datos…', fraccion = 0, paso = 0 } = progreso || {}
  const [demorando, setDemorando] = useState(false)

  useEffect(() => {
    setDemorando(false)
    const t = setTimeout(() => setDemorando(true), 9000)
    return () => clearTimeout(t)
  }, [mensaje])

  return (
    <div className="state loader-full">
      <div className="loader-card">
        <div className="loader-badge">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2l8 3v6c0 5-3.4 8.7-8 11-4.6-2.3-8-6-8-11V5l8-3z" fill="#12c2a8" />
            <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="loader-title">Preparando tu panel</h1>
        <p className="loader-mensaje" key={mensaje}>
          {mensaje}
        </p>
        <div className="loader-track">
          <div className="loader-fill" style={{ width: `${Math.max(6, Math.round(fraccion * 100))}%` }} />
        </div>
        <div className="loader-pasos">
          {ETAPAS.map((etiqueta, i) => (
            <div key={etiqueta} className={'loader-paso' + (i < paso ? ' hecho' : i === paso ? ' activo' : '')}>
              <PasoIcono estado={i < paso ? 'hecho' : i === paso ? 'activo' : 'pendiente'} />
              {etiqueta}
            </div>
          ))}
        </div>
        <p className="loader-sub">
          {demorando
            ? 'Está tardando un poco más de lo normal — seguimos intentando, danos un momento más.'
            : 'La primera carga puede tardar unos segundos.'}
        </p>
      </div>
    </div>
  )
}

/** Aviso en línea mientras llegan (en segundo plano) los resultados de QSQS 2026. */
export function CargandoQsqs() {
  return (
    <section className="panel" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div className="spinner" />
      <div>
        <strong>Cargando los resultados de QSQS 2026…</strong>
        <div className="muted">
          Son muchos datos (competencias, afirmaciones y evidencias); en unos segundos aparecen.
        </div>
      </div>
    </section>
  )
}

export function ErrorEstado({ mensaje, onReintentar }) {
  return (
    <div className="state">
      <h1>No se pudieron cargar los datos</h1>
      <p>{mensaje}</p>
      {onReintentar && (
        <button type="button" className="btn" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  )
}

export function SinToken({ contexto = 'este panel' }) {
  return (
    <div className="state">
      <h1>Falta el enlace de acceso</h1>
      <p>
        Para ver {contexto} necesitas abrirlo con el enlace que incluye el token
        (<code>?token=…</code>).
      </p>
    </div>
  )
}
