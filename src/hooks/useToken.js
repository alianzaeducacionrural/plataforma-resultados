import { useState } from 'react'

/**
 * El token se lee UNA SOLA VEZ al cargar la página (del `?token=` que venga
 * en el hash) y se guarda en estado — no se vuelve a leer de la URL después.
 *
 * Por qué: los links internos (sidebar, tablas, "ver detalle"...) navegan a
 * rutas como `#/instituciones` sin el `?token=`. Si lo leyéramos en cada
 * render con useSearchParams(), cualquier click en el menú "perdía" el token
 * y la app volvía a la pantalla de "falta el enlace de acceso".
 */
function leerTokenInicial() {
  const hash = window.location.hash || ''
  const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
  const fromUrl = new URLSearchParams(query).get('token')
  if (fromUrl) return fromUrl
  if (import.meta.env.DEV) return import.meta.env.VITE_TOKEN_MAESTRO || null
  return null
}

export function useToken() {
  const [token] = useState(leerTokenInicial)
  return token
}
