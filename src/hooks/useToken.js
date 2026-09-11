import { useState } from 'react'

// El panel general es público: si no viene un token en la URL, se usa este
// (el mismo token maestro del backend). Decisión explícita: cualquiera con el
// link ve el comparativo departamental agregado — no hay datos de estudiantes
// individuales, solo por institución. Los enlaces por institución siguen
// funcionando igual (su propio token, en la URL, tiene prioridad sobre este).
const TOKEN_PUBLICO = 'aTMKfuu0PvamE-sdX1Kws7EhE24mqc7J'

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
  return fromUrl || TOKEN_PUBLICO
}

export function useToken() {
  const [token] = useState(leerTokenInicial)
  return token
}
