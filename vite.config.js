import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // URL /exec de Apps Script → separamos origen y path.
  let origin = ''
  let path = ''
  try {
    const u = new URL((env.VITE_API_URL || '').replace(/\?.*$/, ''))
    origin = u.origin
    path = u.pathname
  } catch {
    // sin VITE_API_URL configurada: sin proxy
  }

  return {
    base: './', // rutas relativas → sirve igual en GitHub Pages bajo un subpath
    plugins: [react()],
    server: {
      // En dev, /gas → Apps Script server-side: evita el lío de CORS + redirect
      // a googleusercontent.com que a veces falla desde el navegador.
      proxy: origin
        ? {
            '/gas': {
              target: origin,
              changeOrigin: true,
              followRedirects: true,
              rewrite: (p) => p.replace(/^\/gas/, path),
            },
          }
        : undefined,
    },
  }
})
