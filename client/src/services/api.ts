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

// Interceptor para injetar o token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("@CentroAutomotivo:token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para forçar logout no erro 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Limpar os dados do usuário
      localStorage.removeItem("@CentroAutomotivo:token");
      localStorage.removeItem("@CentroAutomotivo:user");
      localStorage.removeItem("@CentroAutomotivo:mustChangePassword");
      
      // Emitir evento global para que o frontend/App.tsx capture e recarregue
      window.dispatchEvent(new Event("unauthorized"));
    }
    return Promise.reject(error);
  }
);
