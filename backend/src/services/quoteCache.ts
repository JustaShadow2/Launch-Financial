import { prisma } from "../lib/prisma";
import { config } from "../lib/config";
import { isCryptoSymbol, normalizeSymbol } from "./symbols";
import { fetchQuote as fetchFinnhubQuote, isConfigured as finnhubReady } from "./finnhub";
import { fetchQuote as fetchTdQuote, isConfigured as twelveDataReady } from "./twelvedata";

/**
 * In-memory cache of real quotes, kept warm ONLY for symbols on users'
 * watchlists (plus any explicitly warmed symbol).
 *
 * A background loop periodically refreshes the distinct set of watchlisted
 * symbols so those quotes are instantly available. Everything else is priced
 * on demand by marketData.ts. Stocks/ETFs refresh via Finnhub, crypto via
 * Twelve Data.
 *
 * The rest of the app reads warmed values synchronously via getRealPrice /
 * getRealPreviousClose / hasRealData.
 */

interface CachedQuote {
  price: number;
  previousClose: number;
  fetchedAt: number;
}

const cache = new Map<string, CachedQuote>();

// The set of symbols to keep warm. Seeded from watchlists each cycle, and can
// be extended immediately via warmSymbol() when a user watchlists something.
const warmSet = new Set<string>();

let started = false;

export function getRealPrice(symbol: string): number | null {
  return cache.get(normalizeSymbol(symbol))?.price ?? null;
}

export function getRealPreviousClose(symbol: string): number | null {
  return cache.get(normalizeSymbol(symbol))?.previousClose ?? null;
}

export function hasRealData(symbol: string): boolean {
  return cache.has(normalizeSymbol(symbol));
}

function store(symbol: string, price: number, previousClose: number) {
  cache.set(normalizeSymbol(symbol), { price, previousClose, fetchedAt: Date.now() });
}

async function refreshOne(symbol: string): Promise<void> {
  const s = normalizeSymbol(symbol);
  if (isCryptoSymbol(s)) {
    if (!twelveDataReady()) return;
    const q = await fetchTdQuote(s);
    if (q) store(s, q.price, q.previousClose);
    return;
  }
  // Stocks / ETFs: Finnhub preferred, Twelve Data fallback.
  if (finnhubReady()) {
    const q = await fetchFinnhubQuote(s);
    if (q) return store(s, q.current, q.previousClose);
  }
  if (twelveDataReady()) {
    const q = await fetchTdQuote(s);
    if (q) store(s, q.price, q.previousClose);
  }
}

/** Add a symbol to the warm set and prime it right away. */
export function warmSymbol(symbol: string): void {
  const s = normalizeSymbol(symbol);
  if (!s) return;
  warmSet.add(s);
  void refreshOne(s);
}

/** Load the distinct set of symbols across all users' watchlists. */
async function loadWatchlistSymbols(): Promise<string[]> {
  const rows = await prisma.watchlistItem.findMany({ select: { symbol: true } });
  const set = new Set<string>();
  for (const r of rows) set.add(normalizeSymbol(r.symbol));
  return Array.from(set);
}

/**
 * Refresh all warm symbols, spacing requests to respect free-tier rate limits.
 * Finnhub allows 60/min; Twelve Data 8/min. We conservatively space by the
 * slower cadence when crypto is present.
 */
async function refreshAll(): Promise<void> {
  // Rebuild the warm set from the current watchlists (union with any warmed).
  const watch = await loadWatchlistSymbols();
  for (const s of watch) warmSet.add(s);

  const symbols = Array.from(warmSet);
  if (symbols.length === 0) return;

  const cycleMs = config.quoteRefreshMs;
  const spacing = (cycleMs * 0.8) / symbols.length;
  symbols.forEach((s, i) => {
    setTimeout(() => void refreshOne(s), Math.round(spacing * i));
  });
}

export function startQuoteCache(): void {
  if (started) return;
  started = true;

  const sources: string[] = [];
  if (finnhubReady()) sources.push("Finnhub (stocks/ETFs)");
  if (twelveDataReady()) sources.push("Twelve Data (crypto + history)");

  if (sources.length === 0) {
    console.log(
      "[market] No market-data API keys set — quotes will be unavailable until a key is configured."
    );
    return;
  }

  console.log(
    `[market] Dynamic search-only mode. Real data via ${sources.join(
      " + "
    )}. Warm cache tracks watchlist symbols only.`
  );

  void refreshAll();
  setInterval(() => void refreshAll(), config.quoteRefreshMs);
}
