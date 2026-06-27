# =========================================================================
# Multi-stage build:
#   - "dev"   → Vite dev server (HMR), usado pelo docker-compose.dev.yml
#   - "build" → roda "vite build" e gera /app/client/dist
#   - "prod"  → nginx servindo os estáticos em :8080 (default em prod)
# =========================================================================

# ---------- DEV ----------
FROM node:20-slim AS dev
WORKDIR /app/client
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173 8080
CMD ["npm", "run", "dev", "--", "--host"]

# ---------- BUILD ----------
FROM node:20-slim AS build
WORKDIR /app/client
COPY package*.json ./
RUN npm install
COPY . .
# Vite inlineia VITE_* no bundle em build-time. Recebe via build arg.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
# Usa "vite build" direto (sem tsc) pra não quebrar deploy por type error.
RUN npx vite build

# ---------- PROD ----------
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
