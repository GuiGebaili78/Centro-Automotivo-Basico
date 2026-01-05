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
      usePolling: true, 
      interval: 100, // Check files every 100ms
      binaryInterval: 300, // Check binary files less often
    },
    hmr: {
      clientPort: 5173, // Ensures simple WebSocket connection from browser
    }
  }
})
