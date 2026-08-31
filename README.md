# Launch Financial

A full-stack investing app using **simulated money and real market prices**. Sign up, open one or more investment accounts, add mock funds, search for any real stock/ETF/crypto, buy and sell, and track your portfolio's value and performance over time. There's also a built-in learn-to-invest academy. Trades and balances are simulated — **no real money is ever involved**.

**Live app:** https://launch-financial.onrender.com

## Features

- **Auth & profile** — register / login with JWT + bcrypt. Persistent accounts in Postgres (data survives deploys), case-insensitive duplicate-email protection, signup email validation (rejects malformed and disposable addresses, suggests common typo fixes), and forgot-password via an emailed 6-digit code. A Profile page lets you update your name, change your email, change your password, and delete your account.
- **Home** — a real net-worth-over-time chart (reconstructed from your transaction ledger) with 1W / 1M / 3M / 1Y / ALL range toggles, plus totals and your accounts at a glance.
- **Accounts** — open one or more account types yourself (Personal, TFSA, RRSP, Crypto), each with its own cash balance and positions. New users start with **no accounts** and open their first from the Transfer page.
- **Transfer** — mock deposits and withdrawals with a full cash ledger and withdrawal-balance validation.
- **Market** — dynamic, search-only: look up any real stock, ETF, or crypto by name or ticker. The default view also shows your watchlist and curated "Popular" stock / ETF / crypto sections with live quotes. Quotes and 1W–1Y history come from live data providers.
- **Trading** — market buy/sell orders (fractional shares supported), with fund/share validation, average-cost tracking, and position updates.
- **Portfolio** — holdings with live market value, cost basis, unrealized P/L (dollar + %), and net worth across all accounts.
- **Watchlist** — track symbols you're interested in; watchlisted symbols are kept quote-warm in the background.
- **Activity** — full history of deposits, withdrawals, and trades per account.
- **Learn** — a Duolingo-style investing & financial-literacy academy: 20 courses / 76 lessons spanning the basics through options, margin & short selling, fundamentals, macro, taxes, and behavioral finance. Each lesson has teaching slides + a quiz, with a "one lesson a day" plan, sequential unlocking, XP, and daily streaks. Progress is tracked per user.
- **Coach** — an AI learning chatbot (Groq LLM) grounded in each user's own accounts, holdings, and recent buy/sell decisions. It explains and teaches from what you actually did in the simulator; it's educational and does not give personalized buy/sell advice.

## Tech stack

- **Backend:** Node + Express + TypeScript, Prisma ORM, PostgreSQL (Neon), JWT auth, Zod validation.
- **Frontend:** React + TypeScript, Vite, React Router, Recharts.
- **AI coach:** Groq (`groq-sdk`, `llama-3.3-70b-versatile`).
- **Email:** Resend (transactional password-reset codes).
- **Deploy:** Docker on Render (single service serving API + built frontend); Neon-hosted Postgres.

## Project structure

```
backend/    Express API, Prisma schema + migrations, dynamic market-data engine, trading engine, email
frontend/   React app (auth, profile, dashboard, portfolio, market, asset/trade, watchlist, activity, funding, learn)
Dockerfile  Single production image (builds frontend + backend)
render.yaml Render Blueprint (service + env var declarations)
```

## Getting started (local)

You'll need a PostgreSQL database. The easiest free option is a [Neon](https://neon.tech) project (no card required); a local Postgres works too.

From the repo root:

```bash
# 1. Install all workspace dependencies
npm install

# 2. Configure backend env
cd backend
cp .env.example .env
#   then edit .env and set DATABASE_URL (and DIRECT_URL) to your Postgres,
#   plus FINNHUB_API_KEY / TWELVE_DATA_API_KEY for market data.

# 3. Apply migrations and seed the demo login
npx prisma migrate deploy
npm run seed
cd ..
```

### Run it (two terminals)

```bash
# Terminal 1 — API on http://localhost:4137
npm run dev:backend

# Terminal 2 — web app on http://localhost:5173 (proxies /api to the backend)
npm run dev:frontend
```

Then open http://localhost:5173.

> The backend defaults to port **4137**. If that port is in use, start it with a different port, e.g. `PORT=4200 npm run dev:backend`, and update the Vite proxy target in `frontend/vite.config.ts`.

### Demo login

```
email:    demo@launchfinancial.app
password: password123
```

The demo account starts blank — no accounts, no funds. Open your first account and add mock money from the **Transfer** page, just like a new user. (You can also register your own account; the demo seed is idempotent and never touches real users.)

## Database (Neon Postgres)

User data is stored in Postgres and persists across deploys.

- **Schema changes** are managed with Prisma migrations in `backend/prisma/migrations`.
- Locally and in production, apply them with `npx prisma migrate deploy` (non-destructive — never wipes data).
- On Render, the container's start script runs `prisma migrate deploy` + an idempotent demo seed on every boot.

Required env vars (see `backend/.env.example`):

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection (Neon **pooled** string) |
| `DIRECT_URL` | Optional: Neon **direct** string, used for migrations |
| `JWT_SECRET` | Signs auth tokens |

## Market data

The app is **dynamic and search-only** — there is no fixed list of symbols. Search for any real stock, ETF, or crypto; prices come from live data providers. Symbol metadata (name, asset type) is cached in the database the first time a symbol is seen.

Two free data sources:

| Source | Free key | Provides |
| --- | --- | --- |
| [Finnhub](https://finnhub.io/register) | 60 req/min | Symbol search + real-time stock/ETF quotes |
| [Twelve Data](https://twelvedata.com/register) | 8 req/min, 800/day | Crypto quotes + historical charts (all asset types) |

Both keys are recommended: Finnhub powers search and stock/ETF quotes; Twelve Data covers crypto and historical chart data.

Behavior:
- **Quotes:** stocks/ETFs via Finnhub, crypto via Twelve Data. Resolved on demand and briefly cached (~15s).
- **Warm cache:** a background loop keeps quotes fresh **only for symbols on users' watchlists** — read from the database each cycle. Everything else is priced on demand.
- **Historical charts:** real daily candles from Twelve Data, cached ~1h. If history is unavailable (e.g. daily quota reached), the chart falls back to the current price point.
- If a symbol can't be resolved to a real price, the app returns a clear error rather than fabricating data.

> Note on free tiers: Twelve Data's free plan is 800 requests/day. If exhausted, crypto quotes and historical charts pause until the quota resets; Finnhub stock quotes are unaffected.

## Email (password reset)

Forgot-password sends a 6-digit code via [Resend](https://resend.com).

- Set `RESEND_API_KEY` (and optionally `EMAIL_FROM`) to send real emails.
- If `RESEND_API_KEY` is unset, the code is logged to the server console instead — a dev fallback so the flow still works end to end.

## Coach (AI chatbot)

The Coach tab is powered by [Groq](https://console.groq.com) — the same setup as the AI-Chef project (`GROQ_API_KEY`, model `llama-3.3-70b-versatile`).

- Each request is grounded in the signed-in user's own portfolio: net worth, per-account cash and positions with P/L, and their most recent trades. Responses are tailored to what that user actually did.
- It's an educational tutor — it explains concepts and the reasoning behind decisions, and deliberately avoids personalized buy/sell advice.
- Set `GROQ_API_KEY` to enable it (use the same value as AI-Chef). If unset, the Coach tab shows an "unavailable" state and the API returns a clear 503.

## How trading works

- Trades execute immediately at the current real price. Buys reduce cash and update the position's average cost; sells increase cash and reduce quantity. Everything is recorded in the transaction and order ledgers.

## Deployment (Render + Neon)

The repo includes a `Dockerfile` (builds the frontend and backend into one image; the backend also serves the built frontend) and a `render.yaml` Blueprint.

1. Create a Neon project and copy its **pooled** and **direct** connection strings.
2. On Render, create the Docker web service (or use the Blueprint) and set env vars: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `FINNHUB_API_KEY`, `TWELVE_DATA_API_KEY`, and optionally `RESEND_API_KEY` / `EMAIL_FROM` and `GROQ_API_KEY` (for the Coach).
3. Deploy. On boot the container runs `prisma migrate deploy` (applies pending migrations without data loss) and an idempotent demo seed, then serves the app on Render's `$PORT`.

## Useful scripts

Root:
- `npm run dev:backend` / `npm run dev:frontend` — run each side in dev mode
- `npm run build` — build backend and frontend
- `npm run seed` — ensure the demo login exists (idempotent, non-destructive)

Backend (`cd backend`):
- `npx prisma migrate dev --name <name>` — create + apply a new migration (dev)
- `npx prisma migrate deploy` — apply pending migrations (prod/local, no data loss)
- `npx prisma studio` — browse the database in a GUI
- `npm run typecheck` — type-check without emitting
