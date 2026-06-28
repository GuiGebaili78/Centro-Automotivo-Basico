import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Variáveis injetadas pelo docker-compose:
//   - docker-compose.yml         → prod  (8080, painel.gunz.com.br, wss/443)
//   - docker-compose.dev.yml     → dev   (5173, sem allowedHosts, ws/5173)
const port = Number(process.env.VITE_PORT || 5173);

const allowedHostsList = (process.env.VITE_ALLOWED_HOSTS || "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    strictPort: true,
    port,
    allowedHosts: allowedHostsList.length > 0 ? allowedHostsList : true,
    watch: {
      // Polling necessário no Docker/WSL2 para detectar mudanças de arquivo
      usePolling: true,
      interval: 1000,
      ignored: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
    },
    hmr: {
      // clientPort garante que o browser conecte na porta certa (host Windows)
      clientPort: Number(process.env.VITE_HMR_CLIENT_PORT || port),
    },
  },
});
