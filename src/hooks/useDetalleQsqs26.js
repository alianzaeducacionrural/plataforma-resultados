import { useEffect, useState } from 'react'
import { fetchQsqs2026 } from '../api/client.js'
import { filasQsqs2026 } from '../lib/qsqs2026.js'
import { useModelo } from '../state/store.jsx'

/**
 * Filas de QSQS 2026 de UNA institución a todos los niveles (competencia + afirmación +
 * evidencia), para el detalle de la ficha.
 *
 * Con token de institución el detalle ya viene en el modelo. Con token maestro el panel solo
 * cargó competencias (liviano), así que acá se pide el detalle de esa institución
 * (`nivel=detalle&dane=`), que son ~90 filas.
 *
 * @returns {{ estado: 'listo'|'cargando'|'error', filas: Array<{id:number,a1:number|null,a2:number|null}> }}
 */
export function useDetalleQsqs26(inst) {
  const { token, modelo } = useModelo()
  const yaTiene = !!inst?.q26?.tieneDetalle
  const dane = inst?.dane
  const hayQ26 = !!inst?.q26
  const [res, setRes] = useState({ dane: null, estado: 'cargando', filas: [] })

  useEffect(() => {
    if (!hayQ26 || yaTiene) return
    let vivo = true
    fetchQsqs2026(token, { nivel: 'detalle', dane })
      .then((q) => vivo && setRes({ dane, estado: 'listo', filas: filasQsqs2026(q.resultados) }))
      .catch(() => vivo && setRes({ dane, estado: 'error', filas: [] }))
    return () => {
      vivo = false
    }
  }, [token, dane, hayQ26, yaTiene])

  if (!hayQ26 || !modelo?.q26) return { estado: 'error', filas: [] }
  if (yaTiene) return { estado: 'listo', filas: inst.q26.filas }
  if (res.dane !== dane) return { estado: 'cargando', filas: inst.q26.filas }
  return { estado: res.estado, filas: [...inst.q26.filas, ...res.filas] }
}
