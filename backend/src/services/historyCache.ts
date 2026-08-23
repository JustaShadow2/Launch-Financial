import { config } from "../lib/config";
import { fetchDailySeries, isConfigured } from "./twelvedata";
import { Candle } from "./marketData";

/**
 * Caches real historical daily series from Twelve Data so repeated chart views
 * (and multiple range buttons) don't burn the daily API quota. Series are
 * fetched at the largest needed size and sliced down for smaller ranges.
 */

interface CachedSeries {
  candles: Candle[]; // oldest-first
  fetchedAt: number;
}

const cache = new Map<string, CachedSeries>();
const inflight = new Map<string, Promise<Candle[] | null>>();

// We fetch up to ~1 year and slice locally for shorter ranges.
const MAX_DAYS = 365;

function fresh(entry: CachedSeries | undefined): entry is CachedSeries {
  return Boolean(entry && Date.now() - entry.fetchedAt < config.historyCacheMs);
}

/**
 * Returns real daily candles for the requested number of days, or null if
 * real history is unavailable (no key, error, rate limit).
 */
export async function getRealHistory(symbol: string, days: number): Promise<Candle[] | null> {
  if (!isConfigured()) return null;
  const key = symbol.toUpperCase();

  const cached = cache.get(key);
  if (fresh(cached)) return sliceDays(cached.candles, days);

  // De-dupe concurrent fetches for the same symbol.
  let pending = inflight.get(key);
  if (!pending) {
    pending = fetchDailySeries(symbol, MAX_DAYS).then((series) => {
      if (series && series.length) {
        cache.set(key, { candles: series, fetchedAt: Date.now() });
      }
      return series;
    });
    inflight.set(key, pending);
    pending.finally(() => inflight.delete(key));
  }

  const result = await pending;
  if (!result || !result.length) return null;
  return sliceDays(result, days);
}

function sliceDays(candles: Candle[], days: number): Candle[] {
  if (candles.length <= days) return candles;
  return candles.slice(candles.length - days);
}
