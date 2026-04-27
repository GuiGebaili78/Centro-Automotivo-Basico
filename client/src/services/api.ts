import axios from "axios";

// Raiz da API. Já inclui o /api no final.
//   - Dev (docker-compose.dev.yml): http://localhost:3000/api
//   - Prod (docker-compose.yml):     https://hapi.gunz.com.br/api
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

// Raiz "estática" do backend (sem /api), usada para servir uploads/logo.
export const STATIC_BASE = API_BASE.replace(/\/api$/, "");

export const api = axios.create({
  baseURL: API_BASE,
});
