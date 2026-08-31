import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Dev server runs on 5173. It proxies the backend routes to Flask on 5001 so
// the browser only ever makes same-origin requests to the Vite server — this
// sidesteps cross-origin CORS preflights and the browser local-/private-network
// gating (Chrome PNA, Safari local-network) that otherwise blocks a localhost
// page from calling 127.0.0.1 directly. The proxy target uses 127.0.0.1 (not
// "localhost") because Flask's dev server binds IPv4 only; Node performs the
// proxied request, so it is unaffected by the browser gating.
// The `@` alias points at ./src to mirror the tsconfig path mapping.
const BACKEND = 'http://127.0.0.1:5001'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/track': { target: BACKEND, changeOrigin: true },
      '/report': { target: BACKEND, changeOrigin: true },
    },
  },
})
