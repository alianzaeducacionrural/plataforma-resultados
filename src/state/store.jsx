import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { fetchResumen, limpiarCache } from '../api/client.js'
import { buildModel } from '../lib/model.js'
import { useToken } from '../hooks/useToken.js'
import { useEffect } from 'react'

// ---------------- Datos ----------------
const DatosCtx = createContext(null)

export function DatosProvider({ children }) {
  const token = useToken()
  const [estado, setEstado] = useState({ cargando: true, error: null, modelo: null })
  const [intento, setIntento] = useState(0)

  const reintentar = useCallback(() => {
    limpiarCache()
    setIntento((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!token) {
      setEstado({ cargando: false, error: 'sin-token', modelo: null })
      return
    }
    let vivo = true
    setEstado({ cargando: true, error: null, modelo: null })
    fetchResumen(token)
      .then((datos) => vivo && setEstado({ cargando: false, error: null, modelo: buildModel(datos) }))
      .catch((err) => vivo && setEstado({ cargando: false, error: err.message || 'Error', modelo: null }))
    return () => {
      vivo = false
    }
  }, [token, intento])

  const value = useMemo(() => ({ ...estado, reintentar, token }), [estado, reintentar, token])
  return <DatosCtx.Provider value={value}>{children}</DatosCtx.Provider>
}

export function useModelo() {
  const ctx = useContext(DatosCtx)
  if (!ctx) throw new Error('useModelo fuera de DatosProvider')
  return ctx
}

// ---------------- Filtro global ----------------
const FiltroCtx = createContext(null)

export const FILTRO_VACIO = {
  municipio: 'todos',
  zona: 'todas',
  sector: 'todos',
  q: '',
}

export function filtroActivo(f) {
  return f.municipio !== 'todos' || f.zona !== 'todas' || f.sector !== 'todos' || f.q.trim() !== ''
}

export function FiltroProvider({ children }) {
  const [filtro, setFiltro] = useState(FILTRO_VACIO)
  const set = useCallback((patch) => setFiltro((f) => ({ ...f, ...patch })), [])
  const limpiar = useCallback(() => setFiltro(FILTRO_VACIO), [])

  const aplicar = useCallback(
    (instituciones, { ignorarBusqueda = false } = {}) => {
      const q = filtro.q.trim().toLowerCase()
      return instituciones.filter((d) => {
        if (filtro.municipio !== 'todos' && d.municipio !== filtro.municipio) return false
        if (filtro.zona !== 'todas' && d.zona !== filtro.zona) return false
        if (filtro.sector !== 'todos' && d.sector !== filtro.sector) return false
        if (!ignorarBusqueda && q && !d.nombre.toLowerCase().includes(q) && !String(d.dane).includes(q))
          return false
        return true
      })
    },
    [filtro],
  )

  const value = useMemo(
    () => ({ filtro, set, limpiar, aplicar, activo: filtroActivo(filtro) }),
    [filtro, set, limpiar, aplicar],
  )
  return <FiltroCtx.Provider value={value}>{children}</FiltroCtx.Provider>
}

export function useFiltro() {
  const ctx = useContext(FiltroCtx)
  if (!ctx) throw new Error('useFiltro fuera de FiltroProvider')
  return ctx
}
