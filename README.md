# Wealthsimple Clone (Simulated)

A full-stack investing app modeled on Wealthsimple, using **simulated money and real market prices**. Create an account, add mock funds, search for any real stock/ETF/crypto, buy and sell, and track your portfolio's value and performance over time. Trades and balances are simulated — no real money is ever involved.

## Features

- **Auth & profile** — register / login with JWT + bcrypt, persistent accounts in Postgres, duplicate-email protection, a Profile page (update name, change email, change password, delete account), and forgot-password via emailed 6-digit OTP. Data persists across deploys.
- **Accounts** — multiple account types like Wealthsimple (Personal, TFSA, RRSP, Crypto), each with its own cash balance and positions.
- **Move money** — mock deposits and withdrawals with a full cash ledger.
- **Market** — dynamic, search-only: look up any real stock, ETF, or crypto by name or ticker. Quotes and 1W–1Y history come from live data providers.
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

The app is **dynamic and search-only** — there is no fixed list of symbols. You can search for any real stock, ETF, or crypto, and prices come from live data providers. Symbol metadata (name, asset type) is cached in the database the first time a symbol is seen.

Two free data sources:

| Source | Free key | Provides |
| --- | --- | --- |
| [Finnhub](https://finnhub.io/register) | 60 req/min | Symbol search + real-time stock/ETF quotes |
| [Twelve Data](https://twelvedata.com/register) | 8 req/min, 800/day | Crypto quotes + historical charts (all asset types) |

Both keys are recommended: Finnhub powers search and stock/ETF quotes; Twelve Data covers crypto and the historical chart data.

Behavior:
- **Quotes:** stocks/ETFs via Finnhub, crypto via Twelve Data. Resolved on demand and briefly cached (~15s).
- **Warm cache:** a background loop keeps quotes fresh **only for symbols on users' watchlists** — the set to keep warm is read from the database each cycle. Everything else is priced on demand.
- **Historical charts:** real daily candles from Twelve Data, cached ~1h. If history is unavailable (e.g. daily quota reached), the chart falls back to showing the current price point.
- If a symbol can't be resolved to a real price, the app returns a clear error rather than fabricating data.

### Enable real data

1. Create free accounts at https://finnhub.io/register and https://twelvedata.com/register and copy your API keys.
2. Put them in `backend/.env`:
   ```
   FINNHUB_API_KEY="your_finnhub_key_here"
   TWELVE_DATA_API_KEY="your_twelve_data_key_here"
   ```
3. Restart the backend. On startup you'll see `[market] Dynamic search-only mode. Real data via …`.

How it works: the quote path is async. Watchlist symbols are pre-warmed into an in-memory cache by a background loop (`QUOTE_REFRESH_MS`), staggering requests to respect free-tier limits. Any other symbol (a search hit, a trade ticket, a held position) is fetched on demand and cached briefly. Historical series are cached (`HISTORY_CACHE_MS`, default 1h) so chart browsing doesn't burn the daily quota.

> Note on the free tiers: Twelve Data's free plan is 800 requests/day. If you exhaust it, crypto quotes and historical charts will be temporarily unavailable (they resume when the quota resets); stock quotes via Finnhub are unaffected.

## How trading works

- Trades execute immediately at the current real price. Buys reduce cash and update the position's average cost; sells increase cash and reduce quantity. Everything is recorded in the transaction and order ledgers.

## Useful scripts

Root:
- `npm run dev:backend` / `npm run dev:frontend` — run each side in dev mode
- `npm run build` — build backend and frontend
- `npm run seed` — reseed the demo user

Backend (`cd backend`):
- `npx prisma db push` — sync schema to the SQLite database
- `npx prisma studio` — browse the database in a GUI
- `npm run typecheck` — type-check without emitting
