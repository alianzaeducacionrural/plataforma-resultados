export function Cargando({ texto = 'Cargando datos…' }) {
  return (
    <div className="state">
      <div className="spinner" />
      <p>{texto}</p>
      <p className="muted">La primera carga puede tardar unos segundos (el dataset es grande).</p>
    </div>
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
        Para ver {contexto} necesitás abrirlo con el enlace que incluye el token
        (<code>?token=…</code>).
      </p>
    </div>
  )
}
