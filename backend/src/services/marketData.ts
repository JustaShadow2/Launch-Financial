import {
  AssetType,
  fallbackMeta,
  getSymbolMeta,
  isCryptoSymbol,
  normalizeSymbol,
  searchSymbols as searchProviderSymbols,
  SymbolMetaInfo,
  upsertSymbolMeta,
} from "./symbols";
import { getRealPreviousClose, getRealPrice, hasRealData, warmSymbol } from "./quoteCache";
import { fetchQuote as fetchFinnhubQuote, isConfigured as finnhubReady } from "./finnhub";
import { fetchQuote as fetchTdQuote, isConfigured as twelveDataReady } from "./twelvedata";

/**
 * Market-data engine (dynamic, search-only).
 *
 * There is no static universe and no price simulator. Any real symbol can be
 * priced. Quotes come from:
 *   - the in-memory quote cache (kept warm for watchlist symbols), or
 *   - an on-demand provider fetch (Finnhub for stocks/ETFs, Twelve Data for
 *     crypto or as a fallback), briefly cached.
 *
 * If a symbol can't be resolved to a real price, callers get a clear error
 * rather than fabricated data.
 */

export interface Quote {
  symbol: string;
  name: string;
  type: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  source: "real" | "simulated";
  updatedAt: string;
}

export interface Candle {
  t: number; // epoch ms
  price: number;
}

export class UnknownSymbolError extends Error {
  status = 404;
  constructor(symbol: string) {
    super(`No market data available for symbol: ${symbol}`);
  }
}

function roundPrice(price: number): number {
  if (price < 1) return Math.round(price * 1e6) / 1e6;
  return Math.round(price * 100) / 100;
}

// ── On-demand quote fetch with a short-TTL cache ─────────────────────────────

interface FetchedQuote {
  price: number;
  previousClose: number;
  fetchedAt: number;
}

const onDemandCache = new Map<string, FetchedQuote>();
const ON_DEMAND_TTL_MS = 15_000;

/**
 * Fetch a live quote for a symbol from the appropriate provider.
 * Stocks/ETFs: Finnhub first, Twelve Data fallback. Crypto: Twelve Data.
 */
async function fetchLiveQuote(symbol: string): Promise<{ price: number; previousClose: number } | null> {
  const s = normalizeSymbol(symbol);

  if (isCryptoSymbol(s)) {
    if (!twelveDataReady()) return null;
    const q = await fetchTdQuote(s);
    return q ? { price: q.price, previousClose: q.previousClose } : null;
  }

  // Stocks / ETFs: prefer Finnhub.
  if (finnhubReady()) {
    const q = await fetchFinnhubQuote(s);
    if (q) return { price: q.current, previousClose: q.previousClose };
  }
  // Fallback to Twelve Data (also covers the no-Finnhub-key case).
  if (twelveDataReady()) {
    const q = await fetchTdQuote(s);
    if (q) return { price: q.price, previousClose: q.previousClose };
  }
  return null;
}

/**
 * Resolve a symbol's current price + previous close, using (in order):
 *  1. the warm watchlist cache (sync),
 *  2. the short-TTL on-demand cache,
 *  3. a fresh provider fetch.
 * Returns null if no real price can be obtained.
 */
async function resolveQuote(
  symbol: string
): Promise<{ price: number; previousClose: number; source: "real" } | null> {
  const s = normalizeSymbol(symbol);

  // 1. Warm cache (watchlist symbols refreshed in the background).
  const warmPrice = getRealPrice(s);
  if (warmPrice != null) {
    const pc = getRealPreviousClose(s);
    return { price: warmPrice, previousClose: pc ?? warmPrice, source: "real" };
  }

  // 2. Short-TTL on-demand cache.
  const cached = onDemandCache.get(s);
  if (cached && Date.now() - cached.fetchedAt < ON_DEMAND_TTL_MS) {
    return { price: cached.price, previousClose: cached.previousClose, source: "real" };
  }

  // 3. Live fetch.
  const live = await fetchLiveQuote(s);
  if (!live) return null;
  onDemandCache.set(s, { ...live, fetchedAt: Date.now() });
  return { ...live, source: "real" };
}

// ── Public API (async) ───────────────────────────────────────────────────────

export async function getPrice(symbol: string): Promise<number> {
  const q = await resolveQuote(symbol);
  if (!q) throw new UnknownSymbolError(symbol);
  return roundPrice(q.price);
}

export async function getPreviousClose(symbol: string): Promise<number> {
  const q = await resolveQuote(symbol);
  if (!q) throw new UnknownSymbolError(symbol);
  return roundPrice(q.previousClose);
}

export function isRealQuote(symbol: string): boolean {
  return hasRealData(symbol);
}

/**
 * Full quote including display metadata. Persists symbol metadata on first
 * sight so portfolio/watchlist can render names/types later without a lookup.
 */
export async function getQuote(symbol: string): Promise<Quote> {
  const s = normalizeSymbol(symbol);
  const resolved = await resolveQuote(s);
  if (!resolved) throw new UnknownSymbolError(symbol);

  const meta = await resolveMeta(s);
  const price = roundPrice(resolved.price);
  const previousClose = roundPrice(resolved.previousClose);
  const change = roundPrice(price - previousClose);
  const changePercent = previousClose ? Math.round((change / previousClose) * 10000) / 100 : 0;

  return {
    symbol: s,
    name: meta.name,
    type: meta.type,
    price,
    previousClose,
    change,
    changePercent,
    source: "real",
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Quotes for a set of symbols. Fetched concurrently; symbols that can't be
 * resolved are omitted from the result (rather than failing the whole batch).
 */
export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  const unique = Array.from(new Set(symbols.map(normalizeSymbol)));
  const results = await Promise.all(
    unique.map(async (s) => {
      try {
        return await getQuote(s);
      } catch {
        return null;
      }
    })
  );
  return results.filter((q): q is Quote => q !== null);
}

/**
 * Resolve display metadata: memory/DB cache → provider search → persisted.
 */
async function resolveMeta(symbol: string): Promise<SymbolMetaInfo> {
  const s = normalizeSymbol(symbol);
  const existing = await getSymbolMeta(s);
  if (existing) return existing;

  // Try to enrich from search so we store a real company name/type.
  let info: SymbolMetaInfo | null = null;
  try {
    const results = await searchProviderSymbols(s);
    info = results.find((r) => r.symbol === s) || null;
  } catch {
    info = null;
  }
  const meta: SymbolMetaInfo = info || fallbackMeta(s);
  // Persist (best effort) so future renders are instant.
  upsertSymbolMeta(meta).catch(() => {});
  return meta;
}

/** Ensure a symbol is added to the warm cache (used when it's watchlisted). */
export function ensureWarm(symbol: string): void {
  warmSymbol(normalizeSymbol(symbol));
}

// ── History ──────────────────────────────────────────────────────────────────

const RANGE_DAYS: Record<string, number> = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };

export function rangeToDays(range: string): number {
  return RANGE_DAYS[range] || 30;
}

/**
 * Real daily history from Twelve Data (cached). Appends the freshest live
 * price as the final point when the last candle is stale. Returns [] if no
 * real history is available.
 */
export async function getHistory(symbol: string, days: number): Promise<Candle[]> {
  const s = normalizeSymbol(symbol);
  const { getRealHistory } = await import("./historyCache");
  const real = await getRealHistory(s, days);
  if (!real || real.length === 0) return [];

  // Append a fresh live point if the last candle is over a minute old.
  try {
    const live = await getPrice(s);
    const last = real[real.length - 1];
    if (Date.now() - last.t > 60 * 1000) {
      return [...real, { t: Date.now(), price: live }];
    }
  } catch {
    // No live price; return the historical series as-is.
  }
  return real;
}

// ── Search (delegates to the dynamic provider search) ────────────────────────

export async function searchSymbols(query: string): Promise<SymbolMetaInfo[]> {
  return searchProviderSymbols(query);
}

export type { AssetType };
