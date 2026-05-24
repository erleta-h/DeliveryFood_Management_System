import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  /** Duhet të përputhet me `applicationUrl` http në `FoodDelivery.Api/Properties/launchSettings.json` (Kestrel). */
  const apiProxyTarget =
    env.VITE_DEV_API_PROXY?.trim() || 'http://localhost:5183'

  /**
   * HTTPS vetëm nëse e aktivizon me VITE_DEV_HTTPS=true në web/.env.
   * Parazgjedhja është http:// — shmang ERR_SSL_VERSION_OR_CIPHER_MISMATCH në Windows.
   */
  const devHttps = env.VITE_DEV_HTTPS === 'true'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      https: devHttps,
      host: true,
      port: 5173,
      strictPort: true,
      open: '/',
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
