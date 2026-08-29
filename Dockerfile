# Launch Financial — single-image production build.
# Builds the React frontend and the Node/Express + Prisma backend, then runs
# the backend which also serves the built frontend as static files.

# ── Stage 1: build the frontend ──────────────────────────────────────────────
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build

# ── Stage 2: build the backend (deps, Prisma client, TS -> JS) ───────────────
FROM node:20-slim AS backend-build
WORKDIR /app/backend
# OpenSSL is required by Prisma's query engine.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json* ./
RUN npm install
COPY backend/ .
RUN npx prisma generate
RUN npm run build

# ── Stage 3: production runtime ──────────────────────────────────────────────
FROM node:20-slim AS production
WORKDIR /app/backend
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
# DATABASE_URL (Neon Postgres) is provided at runtime via the Render env var.
# Data persists in Postgres across deploys; the start script runs
# `prisma migrate deploy` (no data loss) and an idempotent demo seed.
# Tell the backend to serve the built frontend.
ENV SERVE_STATIC_DIR=/app/frontend/dist

# Backend: production node_modules (includes generated Prisma client), compiled
# JS, Prisma schema, and the TS sources needed to run the seed via ts-node.
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/prisma ./prisma
COPY --from=backend-build /app/backend/package.json ./package.json
COPY backend/src ./src
COPY backend/tsconfig.json ./tsconfig.json

# Built frontend served by the backend.
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Startup: apply migrations (migrate deploy), ensure the demo login exists
# (idempotent, non-destructive), then launch the server. Render provides $PORT.
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 4137
CMD ["/app/docker-entrypoint.sh"]
