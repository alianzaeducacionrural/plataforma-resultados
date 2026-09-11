import { useSearchParams } from 'react-router-dom'

/**
 * El token viene de `?token=` en la URL. En desarrollo, si no hay, cae al
 * VITE_TOKEN_MAESTRO del .env.local para no tener que pegarlo cada vez.
 */
export function useToken() {
  const [params] = useSearchParams()
  const fromUrl = params.get('token')
  if (fromUrl) return fromUrl
  if (import.meta.env.DEV) return import.meta.env.VITE_TOKEN_MAESTRO || null
  return null
}
