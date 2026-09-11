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

async function pedir(token, vista) {
  const url = `${API_URL}?token=${encodeURIComponent(token)}&vista=${vista}&_=${Date.now()}`
  let res
  try {
    res = await fetch(url, { redirect: 'follow' })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Revisá la conexión.')
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
 * @param {'resumen'|'qsqs'|'saber11'} vista
 * @returns {Promise<object>} el objeto `datos` de la respuesta
 */
export async function fetchDatos(token, vista = 'resumen') {
  if (!API_URL) throw new ApiError('Falta VITE_API_URL (revisá el .env.local)')
  if (!token) throw new ApiError('Falta el token')

  const key = token + '|' + vista
  if (cache.has(key)) return cache.get(key)

  const promise = (async () => {
    const esperas = [0, 2000, 4000, 7000, 12000]
    for (const espera of esperas) {
      if (espera) await sleep(espera)
      try {
        return await pedir(token, vista)
      } catch (err) {
        if (err.message !== '__reintentable__') throw err
      }
    }
    throw new ApiError(
      'El servidor no devolvió datos después de varios intentos. ' +
        'Puede que la API no esté autorizada, o que Apps Script esté saturado — probá recargar.',
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

/**
 * QSQS + Saber 11 + tablas de referencia (meta), en pedidos EN SERIE (más
 * chicos y más fiables que el de 3 MB de `resumen`).
 */
export async function fetchResumen(token) {
  const qsqs = await fetchDatos(token, 'qsqs')
  const saber11 = await fetchDatos(token, 'saber11')
  const meta = await fetchDatos(token, 'meta')
  return {
    qsqs: qsqs.qsqs ?? qsqs,
    saber11: saber11.saber11 ?? saber11,
    meta,
  }
}

export function limpiarCache() {
  cache.clear()
}
