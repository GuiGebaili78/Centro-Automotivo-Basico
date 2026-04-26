import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all addresses
    strictPort: true,
    port: 8080,
    allowedHosts: ["painel.gunz.com.br"],
    watch: {
      usePolling: true,
      interval: 1000, // Check files every 1000ms (Reduced Load)
      binaryInterval: 2000, // Check binary files less often
    },
    hmr: {
      clientPort: 8080, // Ensures simple WebSocket connection from browser
    },
  },
});
