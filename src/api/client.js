// Cliente del Web App de Apps Script (doGet).
//
// Particularidades de Apps Script que este cliente maneja:
//  - SIEMPRE responde HTTP 200 a nivel lógico: hay que mirar el campo `ok`
//    del JSON, no el status.
//  - `exec` hace un 302 a script.googleusercontent.com. Ese endpoint devuelve
//    404 (una página HTML) si le llegan varias peticiones muy seguidas desde
//    el navegador. Por eso: peticiones EN SERIE (no Promise.all) y con reintento.

// En dev pasamos por el proxy de Vite (/gas → Apps Script server-side), que evita
// el problema de CORS + redirect a googleusercontent.com. En producción (build
// estático) el navegador pega directo a la URL del Web App.
const API_URL = import.meta.env.DEV ? '/gas' : import.meta.env.VITE_API_URL

// Caché en memoria por (token + vista) para no repetir dentro de la sesión.
const cache = new Map()

export class ApiError extends Error {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function pedir(token, vista, extra) {
  const qs = Object.entries(extra || {})
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `&${k}=${encodeURIComponent(v)}`)
    .join('')
  const url = `${API_URL}?token=${encodeURIComponent(token)}&vista=${vista}${qs}&_=${Date.now()}`
  let res
  try {
    res = await fetch(url, { redirect: 'follow' })
  } catch {
    // Falla de red (sin internet, DNS, CORS, etc.). No es necesariamente
    // definitivo — una conexión inestable puede recuperarse en el siguiente
    // intento — así que se trata igual que el 404 flaky del redirect: se
    // reintenta con el mismo backoff en vez de rendirse en el primer golpe.
    throw new ApiError('__reintentable__:red')
  }
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    // GAS devolvió HTML (404 del redirect, o página de login) en vez de JSON.
    throw new ApiError('__reintentable__')
  }
  if (!json.ok) throw new ApiError(json.error || 'Token inválido o inactivo')
  return json.datos
}

/**
 * @param {string} token
 * @param {'resumen'|'qsqs'|'saber11'|'meta'|'historico'|'qsqs2026'} vista
 * @param {number[]} [esperas] Backoff entre reintentos. Default: 5 intentos,
 *   ~25s en total (pensado para el 404 flaky del redirect de Apps Script).
 *   Pasar un esquema más corto para vistas opcionales que no deben demorar
 *   el resto de la carga si fallan (ver `historico` en fetchResumen).
 * @param {Record<string, string>} [extra] Parámetros adicionales de la URL (p. ej. `nivel`, `dane`
 *   para `qsqs2026`); forman parte de la clave de caché.
 * @returns {Promise<object>} el objeto `datos` de la respuesta
 */
export async function fetchDatos(token, vista = 'resumen', esperas = [0, 2000, 4000, 7000, 12000], extra = null) {
  if (!API_URL) throw new ApiError('Falta VITE_API_URL (revisá el .env.local)')
  if (!token) throw new ApiError('Falta el token')

  const key = token + '|' + vista + (extra ? '|' + JSON.stringify(extra) : '')
  if (cache.has(key)) return cache.get(key)

  const promise = (async () => {
    let falloDeRed = false
    for (const espera of esperas) {
      if (espera) await sleep(espera)
      try {
        return await pedir(token, vista, extra)
      } catch (err) {
        if (!err.message.startsWith('__reintentable__')) throw err
        falloDeRed = err.message === '__reintentable__:red'
      }
    }
    throw new ApiError(
      falloDeRed
        ? 'No se pudo conectar con el servidor después de varios intentos. Revisá tu conexión a internet e intentá de nuevo.'
        : 'El servidor no devolvió datos después de varios intentos. ' +
            'Puede que la API no esté autorizada, o que Apps Script esté saturado — prueba a recargar.',
    )
  })()

  cache.set(key, promise)
  try {
    return await promise
  } catch (err) {
    cache.delete(key) // no cachear errores
    throw err
  }
}

// Etapas de fetchResumen, en el orden real en que se piden — usadas por el
// loader de la pantalla de carga para mostrarle a la persona qué se está
// trayendo, con lenguaje llano (nada de "vista", "token" ni "caché").
export const ETAPAS_CARGA = [
  { etiqueta: 'QSQS', mensaje: 'Cargando los resultados de QSQS…' },
  { etiqueta: 'Saber 11', mensaje: 'Cargando los resultados de Saber 11…' },
  { etiqueta: 'Instituciones', mensaje: 'Cargando el catálogo de instituciones…' },
  { etiqueta: 'Histórico', mensaje: 'Cargando el histórico 2023-2025…' },
]

/**
 * QSQS + Saber 11 + tablas de referencia (meta) + histórico 2023-2025, en
 * pedidos EN SERIE (más chicos y más fiables que el de 3 MB de `resumen`).
 *
 * @param {string} token
 * @param {(p: {paso: number, total: number, mensaje: string, fraccion: number}) => void} [onProgreso]
 *   Se llama antes de cada etapa para que la pantalla de carga muestre una
 *   barra de progreso y el mensaje correspondiente.
 */
export async function fetchResumen(token, onProgreso) {
  const total = ETAPAS_CARGA.length
  const avisar = (paso, mensaje, fraccion) => onProgreso?.({ paso, total, mensaje, fraccion })

  avisar(0, ETAPAS_CARGA[0].mensaje, 0.06)
  const qsqs = await fetchDatos(token, 'qsqs')
  avisar(1, ETAPAS_CARGA[1].mensaje, 0.3)
  const saber11 = await fetchDatos(token, 'saber11')
  avisar(2, ETAPAS_CARGA[2].mensaje, 0.55)
  const meta = await fetchDatos(token, 'meta')
  avisar(3, ETAPAS_CARGA[3].mensaje, 0.75)
  // El histórico es un agregado opcional (no bloquea el resto de la app si el
  // backend todavía no lo tiene desplegado, o si el Sheet fuente no está listo).
  // Un solo intento con un reintento corto — si falla, no vale la pena hacerle
  // esperar al usuario los ~25s del backoff completo por una vista no crítica.
  let historico = null
  try {
    historico = await fetchDatos(token, 'historico', [0, 1500])
  } catch (err) {
    console.warn('No se pudo cargar el histórico:', err.message)
  }
  avisar(4, 'Preparando tu panel…', 0.95)
  return {
    qsqs: qsqs.qsqs ?? qsqs,
    saber11: saber11.saber11 ?? saber11,
    meta,
    historico,
  }
}

export function limpiarCache() {
  cache.clear()
}

/**
 * QSQS 2026 (Aplicación 1 vs 2). Va aparte de `fetchResumen` y se pide en segundo plano:
 * la pantalla inicial (Saber 11) no lo necesita, y son ~20.000 filas.
 *  - `{ nivel: 'comp' }`: solo competencias (liviano; agregados del panel, token maestro).
 *  - `{ nivel: 'detalle', dane }`: afirmaciones + evidencias de UNA institución (ficha).
 *  - sin parámetros: todo (lo usa el token de institución, que ya viene filtrado a su DANE).
 */
export function fetchQsqs2026(token, { nivel, dane } = {}) {
  return fetchDatos(token, 'qsqs2026', [0, 2000, 5000], { nivel, dane })
}
