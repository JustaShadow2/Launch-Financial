# Wealthsimple Clone (Simulated)

A full-stack investing app modeled on Wealthsimple, using **simulated money and simulated market prices**. Create an account, add mock funds, buy and sell stocks/ETFs/crypto, and track your portfolio's value and performance over time. No real money and no real market feed are involved.

## Features

- **Auth** — register / login with JWT + bcrypt password hashing.
- **Accounts** — multiple account types like Wealthsimple (Personal, TFSA, RRSP, Crypto), each with its own cash balance and positions.
- **Move money** — mock deposits and withdrawals with a full cash ledger.
- **Market** — 25 simulated symbols across stocks, ETFs, and crypto. Quotes update every few seconds; deterministic price history for 1W–1Y ranges.
- **Trading** — market buy/sell orders (fractional shares supported), with fund/share validation, average-cost tracking, and position updates.
- **Portfolio** — holdings with live market value, cost basis, unrealized P/L (dollar + %), and net worth across all accounts.
- **Watchlist** — track symbols you're interested in.
- **Activity** — full history of deposits, withdrawals, and trades per account.
- **Learn** — a Duolingo-style investing & financial-literacy academy. Courses grouped by topic (Getting Started, Financial Literacy, Building a Portfolio, Risk & Markets, Options From Scratch), with bite-sized lessons (teaching slides + a quiz), a "one lesson a day" plan, sequential unlocking, XP, and daily streaks. Progress is tracked per user.

## Tech stack

- **Backend:** Node + Express + TypeScript, Prisma ORM, SQLite. JWT auth. Zod validation.
- **Frontend:** React + TypeScript, Vite, React Router, Recharts.

## Project structure

```
backend/    Express API, Prisma schema, simulated market-data engine, trading engine
frontend/   React app (auth, dashboard, portfolio, market, asset/trade, watchlist, activity, funding)
```

## Getting started

From the repo root:

```bash
# 1. Install all workspace dependencies
npm install

# 2. Set up the database (creates SQLite dev.db) and seed a demo user
cd backend
npx prisma db push
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

> The backend defaults to port **4137**. If that port is also in use, start it with a different port, e.g. `PORT=4200 npm run dev:backend`, and update the Vite proxy target in `frontend/vite.config.ts`.

### Demo login

```
email:    demo@wealthsimple.dev
password: password123
```

The demo account comes pre-funded with two accounts (Personal + TFSA) and a handful of seeded positions so you can explore right away. You can also register a fresh account and fund it from the **Move money** page.

## Market data

The app can use **real market data** or a built-in **simulator** — it decides per symbol at runtime, and always falls back to the simulator so it never breaks or blocks on the network.

Two optional free data sources:

| Source | Free key | Provides |
| --- | --- | --- |
| [Twelve Data](https://twelvedata.com/register) | 8 req/min, 800/day | Real quotes **and** real historical charts for stocks, ETFs, **and crypto** |
| [Finnhub](https://finnhub.io/register) | 60 req/min | Faster real-time stock/ETF quotes (optional upgrade) |

Recommended: **just set a Twelve Data key** — it covers real quotes and real historical charts for everything, including crypto. Add Finnhub too if you want higher-frequency stock quote refresh.

Behavior:
- **Quotes:** Finnhub for stocks/ETFs when configured; otherwise Twelve Data; crypto always via Twelve Data. Falls back to the simulator if unset, rate-limited, or on error.
- **Historical charts:** real daily candles from Twelve Data (cached ~1h). Falls back to the simulated series (scaled to the real live price) when unavailable.
- Each quote reports its `source` (`"real"` or `"simulated"`), and the asset page shows a **● Live** or **◦ Simulated** badge.

### Enable real data

1. Create a free account at https://twelvedata.com/register and copy your API key.
2. Put it in `backend/.env`:
   ```
   TWELVE_DATA_API_KEY="your_key_here"
   # optional, for faster stock quotes:
   FINNHUB_API_KEY="your_finnhub_key_here"
   ```
3. Restart the backend. On startup you'll see `[market] Real data enabled via …`.

How it works: a background loop refreshes quotes into an in-memory cache (`QUOTE_REFRESH_MS` for Finnhub stocks, `CRYPTO_REFRESH_MS` for Twelve Data), staggering requests to stay under free-tier limits. API reads are served synchronously from that cache. Historical series are fetched from Twelve Data on demand and cached (`HISTORY_CACHE_MS`, default 1h) so chart browsing doesn't burn the daily quota.

## How trading works

- Trades execute immediately at the current price (real or simulated). Buys reduce cash and update the position's average cost; sells increase cash and reduce quantity. Everything is recorded in the transaction and order ledgers.

## Useful scripts

Root:
- `npm run dev:backend` / `npm run dev:frontend` — run each side in dev mode
- `npm run build` — build backend and frontend
- `npm run seed` — reseed the demo user

Backend (`cd backend`):
- `npx prisma db push` — sync schema to the SQLite database
- `npx prisma studio` — browse the database in a GUI
- `npm run typecheck` — type-check without emitting
