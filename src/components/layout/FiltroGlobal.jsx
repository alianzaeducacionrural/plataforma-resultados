import { useModelo } from '../../state/store.jsx'
import { useFiltro } from '../../state/store.jsx'
import { Seg } from '../ui.jsx'

/** Barra de filtro global — scopea toda la app. `children` permite sumar un
 * campo propio de la página (p. ej. el selector de Área en Análisis por
 * área) para que quede en la misma fila que Municipio/Zona/Sector. */
export default function FiltroGlobal({ conBusqueda = true, children }) {
  const { modelo } = useModelo()
  const { filtro, set, limpiar, activo } = useFiltro()
  if (!modelo) return null

  return (
    <div className="filterbar">
      <div className="field">
        <label htmlFor="fg-mun">Municipio</label>
        <select id="fg-mun" value={filtro.municipio} onChange={(e) => set({ municipio: e.target.value })}>
          <option value="todos">Todos ({modelo.municipios.length})</option>
          {modelo.municipios.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Zona</label>
        <Seg
          value={filtro.zona}
          onChange={(v) => set({ zona: v })}
          options={[
            { value: 'todas', label: 'Todas' },
            { value: 'Urbana', label: 'Urbana' },
            { value: 'Rural', label: 'Rural' },
          ]}
        />
      </div>
      <div className="field">
        <label>Sector</label>
        <Seg
          value={filtro.sector}
          onChange={(v) => set({ sector: v })}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'Oficial', label: 'Oficial' },
            { value: 'No oficial', label: 'No oficial' },
          ]}
        />
      </div>
      {children}
      {conBusqueda && (
        <div className="field grow">
          <label htmlFor="fg-q">Buscar institución</label>
          <input
            id="fg-q"
            type="text"
            placeholder="Nombre o DANE…"
            value={filtro.q}
            onChange={(e) => set({ q: e.target.value })}
          />
        </div>
      )}
      {activo && (
        <button type="button" className="btn ghost sm" onClick={limpiar} style={{ alignSelf: 'flex-end' }}>
          Limpiar
        </button>
      )}
    </div>
  )
}
