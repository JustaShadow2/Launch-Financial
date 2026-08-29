#!/usr/bin/env bash
# Production startup for the Launch Financial container.
set -o errexit

cd /app/backend

echo "[start] Applying database migrations (prisma migrate deploy)…"
# Applies any pending migrations without data loss. Real user data in Postgres
# is preserved across deploys.
npx prisma migrate deploy

echo "[start] Ensuring demo login exists (idempotent, non-destructive)…"
# Creates the demo account only if missing; never deletes users or data.
npm run seed || echo "[start] Demo seed skipped."

echo "[start] Launching server on port ${PORT:-4137}…"
# The backend reads PORT from the environment (Render sets it). Fall back to 4137.
exec node dist/index.js
