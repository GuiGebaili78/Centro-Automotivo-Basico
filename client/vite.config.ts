import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Variáveis injetadas pelo docker-compose:
//   - docker-compose.yml         → prod  (8080, painel.gunz.com.br, wss/443)
//   - docker-compose.dev.yml     → dev   (5173, sem allowedHosts, ws/5173)
const port = Number(process.env.VITE_PORT || 5173);

const allowedHosts = (process.env.VITE_ALLOWED_HOSTS || "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const hmrHost = process.env.VITE_HMR_HOST || undefined;
const hmrProtocol =
  (process.env.VITE_HMR_PROTOCOL as "ws" | "wss") || "ws";
const hmrClientPort = Number(process.env.VITE_HMR_CLIENT_PORT || port);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    strictPort: true,
    port,
    allowedHosts: allowedHosts.length > 0 ? allowedHosts : true,
    watch: {
      usePolling: true,
      interval: 1000,
      binaryInterval: 2000,
    },
    hmr: hmrHost
      ? {
          host: hmrHost,
          protocol: hmrProtocol,
          clientPort: hmrClientPort,
        }
      : {
          clientPort: hmrClientPort,
        },
  },
});
