import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The browser only talks to the Vite server. Requests starting with /api are forwarded to the
// Spring Boot backend, so no CORS setup is needed and only ONE port (5173) must be reachable from a phone.
const backend = process.env.VITE_PROXY_TARGET || 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on all interfaces (needed for GitHub Codespaces / phone testing)
    port: 5173,
    allowedHosts: true, // Codespaces uses hostnames like <name>-5173.app.github.dev
    proxy: {
      '/api': { target: backend, changeOrigin: true },
    },
    hmr: process.env.CODESPACES ? { clientPort: 443 } : undefined,
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: { '/api': { target: backend, changeOrigin: true } },
  },
})
