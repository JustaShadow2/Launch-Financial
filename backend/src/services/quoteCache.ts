import { config } from "../lib/config";
import { SYMBOLS, supportsFinnhubQuote, isCrypto } from "../data/symbols";
import { fetchQuote as fetchFinnhubQuote, isConfigured as finnhubReady } from "./finnhub";
import { fetchQuote as fetchTdQuote, isConfigured as twelveDataReady } from "./twelvedata";

/**
 * In-memory cache of real quotes.
 *
 *  - Stocks & ETFs: refreshed from Finnhub (free tier 60/min).
 *  - Crypto:        refreshed from Twelve Data (free tier 8/min), on a slower
 *                   cadence to stay within limits.
 *
 * The rest of the app reads from this cache synchronously via getRealPrice /
 * getRealPreviousClose and falls back to the simulator when a symbol has no
 * cached real value (no key, rate limit, network error, or unsupported).
 */

interface CachedQuote {
  price: number;
  previousClose: number;
  fetchedAt: number;
}

const cache = new Map<string, CachedQuote>();
let started = false;

export function getRealPrice(symbol: string): number | null {
  return cache.get(symbol.toUpperCase())?.price ?? null;
}

export function getRealPreviousClose(symbol: string): number | null {
  return cache.get(symbol.toUpperCase())?.previousClose ?? null;
}

export function hasRealData(symbol: string): boolean {
  return cache.has(symbol.toUpperCase());
}

function store(symbol: string, price: number, previousClose: number) {
  cache.set(symbol.toUpperCase(), { price, previousClose, fetchedAt: Date.now() });
}

async function refreshFinnhubOne(symbol: string): Promise<void> {
  const q = await fetchFinnhubQuote(symbol);
  if (q) store(symbol, q.current, q.previousClose);
}

async function refreshTdOne(symbol: string): Promise<void> {
  const q = await fetchTdQuote(symbol);
  if (q) store(symbol, q.price, q.previousClose);
}

/**
 * Refresh stock/ETF quotes from Finnhub (preferred — 60/min allows a fast
 * cadence), spacing requests across the cycle to respect the rate limit.
 */
function refreshStocks(): void {
  if (!finnhubReady()) return;
  const supported = SYMBOLS.filter((s) => supportsFinnhubQuote(s.symbol));
  const cycleMs = config.quoteRefreshMs;
  const spacing = supported.length > 0 ? (cycleMs * 0.8) / supported.length : 0;
  supported.forEach((s, i) => {
    setTimeout(() => void refreshFinnhubOne(s.symbol), Math.round(spacing * i));
  });
}

/**
 * Refresh via Twelve Data. Covers crypto always, and also stocks/ETFs when
 * Finnhub isn't configured — so a single Twelve Data key yields real quotes for
 * everything. Each quote costs 2 API credits (price + previous close), so
 * requests are spaced ~2.5s apart to stay under the 8/min free-tier limit.
 */
function refreshTwelveData(): void {
  if (!twelveDataReady()) return;
  const needStockFromTd = !finnhubReady();
  const targets = SYMBOLS.filter(
    (s) => isCrypto(s.symbol) || (needStockFromTd && supportsFinnhubQuote(s.symbol))
  );
  targets.forEach((s, i) => {
    setTimeout(() => void refreshTdOne(s.symbol), i * 2500);
  });
}

export function startQuoteCache(): void {
  if (started) return;
  started = true;

  const sources: string[] = [];
  if (finnhubReady()) sources.push("Finnhub (real-time stock/ETF quotes)");
  if (twelveDataReady()) {
    sources.push(
      finnhubReady()
        ? "Twelve Data (crypto quotes + historical charts)"
        : "Twelve Data (stock/ETF/crypto quotes + historical charts)"
    );
  }

  if (sources.length === 0) {
    console.log(
      "[market] No market-data API keys set — using the built-in price simulator for all symbols."
    );
    return;
  }

  console.log(`[market] Real data enabled via ${sources.join(" + ")}.`);

  if (finnhubReady()) {
    refreshStocks();
    setInterval(refreshStocks, config.quoteRefreshMs);
  }
  if (twelveDataReady()) {
    refreshTwelveData();
    setInterval(refreshTwelveData, config.cryptoRefreshMs);
  }
}
