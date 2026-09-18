import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { fetchQsqs2026, fetchResumen, limpiarCache } from '../api/client.js'
import { buildModel } from '../lib/model.js'
import { useToken } from '../hooks/useToken.js'
import { useEffect } from 'react'

// ---------------- Datos ----------------
const DatosCtx = createContext(null)

const PROGRESO_INICIAL = { paso: 0, total: 4, mensaje: 'Conectando con el servidor…', fraccion: 0.03 }

export function DatosProvider({ children }) {
  const token = useToken()
  const [estado, setEstado] = useState({ cargando: true, error: null, modelo: null })
  const [progreso, setProgreso] = useState(PROGRESO_INICIAL)
  const [intento, setIntento] = useState(0)
  // QSQS 2026 se pide aparte y en segundo plano: 'espera' | 'cargando' | 'listo' | 'vacio' | 'error'
  const [q26Estado, setQ26Estado] = useState('espera')

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
    setProgreso(PROGRESO_INICIAL)
    setQ26Estado('espera')
    fetchResumen(token, (p) => vivo && setProgreso(p))
      .then((datos) => {
        if (!vivo) return
        const modelo = buildModel(datos)
        setEstado({ cargando: false, error: null, modelo })
        // La pantalla inicial (Saber 11) ya se puede usar: QSQS 2026 (~20.000 filas) entra después.
        // Token maestro: solo competencias (liviano; el detalle se pide por institución en la ficha).
        // Token de institución: todo, ya viene filtrado a su DANE.
        setQ26Estado('cargando')
        fetchQsqs2026(token, modelo.instituciones.length <= 1 ? {} : { nivel: 'comp' })
          .then((q) => {
            if (!vivo) return
            const conQ26 = buildModel({ ...datos, qsqs2026: q })
            setEstado({ cargando: false, error: null, modelo: conQ26 })
            setQ26Estado(conQ26.q26?.disponible ? 'listo' : 'vacio')
          })
          .catch((err) => {
            console.warn('No se pudo cargar QSQS 2026:', err.message)
            if (vivo) setQ26Estado('error')
          })
      })
      .catch((err) => vivo && setEstado({ cargando: false, error: err.message || 'Error', modelo: null }))
    return () => {
      vivo = false
    }
  }, [token, intento])

  const value = useMemo(
    () => ({ ...estado, progreso, q26Estado, reintentar, token }),
    [estado, progreso, q26Estado, reintentar, token],
  )
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
