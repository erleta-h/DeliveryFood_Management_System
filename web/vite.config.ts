import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  /** Ku të proxyohet /api në dev (API ASP.NET). 502 = ky adres nuk përgjigjet. */
  const apiProxyTarget =
    env.VITE_DEV_API_PROXY?.trim() || 'http://localhost:5160'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/hubs': {
          target: apiProxyTarget,
          changeOrigin: true,
          ws: true,
          secure: false,
        },
      },
    },
  }
})
