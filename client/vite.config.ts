import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Listen on all addresses
    strictPort: true,
    port: 5173,
    watch: {
      usePolling: true, // Fixes file watching in Docker/WSL2
    },
    hmr: {
      clientPort: 5173, // Ensures simple WebSocket connection from browser
    }
  }
})
