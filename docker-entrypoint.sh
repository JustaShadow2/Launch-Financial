#!/usr/bin/env bash
# Production startup for the Wealthsimple Clone container.
set -o errexit

cd /app/backend

echo "[start] Applying database schema (prisma db push)…"
npx prisma db push --skip-generate --accept-data-loss

echo "[start] Seeding demo data…"
# The seed is idempotent: it recreates the demo user. Failure here shouldn't
# block boot (e.g. if data already exists on a persistent disk).
npm run seed || echo "[start] Seed skipped or already applied."

echo "[start] Launching server on port ${PORT:-4137}…"
# The backend reads PORT from the environment (Render sets it). Fall back to 4137.
exec node dist/index.js
