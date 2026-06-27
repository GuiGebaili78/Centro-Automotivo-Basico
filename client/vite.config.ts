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

const hmrHost = process.env.VITE_HMR_HOST || "localhost";
const hmrProtocol =
  (process.env.VITE_HMR_PROTOCOL as "ws" | "wss") || "ws";
const hmrClientPort = Number(process.env.VITE_HMR_CLIENT_PORT || port);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  cacheDir: "/tmp/.vite-cache",
  optimizeDeps: {
    entries: [],
  },
  server: {
    host: "0.0.0.0",
    strictPort: true,
    port,
    allowedHosts: allowedHostsList.length > 0 ? allowedHostsList : true,
    fs: {
      allow: ["/app/client", "/tmp/.vite-cache"],
    },
    watch: {
      usePolling: false,
      ignored: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
    },
    hmr: {
      host: hmrHost,
      port,
      protocol: hmrProtocol,
      clientPort: hmrClientPort,
      timeout: 30000,
    },
  },
});
