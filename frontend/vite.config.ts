import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Dev server runs on 5173 (matches the backend's FRONTEND_ORIGIN / CORS allow-list).
// The `@` alias points at ./src to mirror the tsconfig path mapping.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
})
