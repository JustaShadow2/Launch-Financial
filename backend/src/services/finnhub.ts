import { config } from "../lib/config";
import { toFinnhubSymbol } from "./symbols";

/**
 * Thin client for Finnhub's free real-time US stock/ETF quote endpoint.
 * Docs: https://finnhub.io/docs/api/quote
 *
 * The /quote response shape:
 *   c  = current price
 *   pc = previous close
 *   o  = open, h = high, l = low
 *   d  = change, dp = percent change
 *   t  = quote timestamp (unix seconds)
 */
export interface FinnhubQuote {
  current: number;
  previousClose: number;
  timestamp: number;
}

export function isConfigured(): boolean {
  return Boolean(config.finnhubApiKey);
}

interface RawQuote {
  c?: number;
  pc?: number;
  t?: number;
}

export async function fetchQuote(symbol: string): Promise<FinnhubQuote | null> {
  if (!isConfigured()) return null;
  const ticker = toFinnhubSymbol(symbol);
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
    ticker
  )}&token=${encodeURIComponent(config.finnhubApiKey)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.status === 429) {
      // Rate limited; caller decides how to handle a missing quote.
      return null;
    }
    if (!res.ok) return null;

    const data = (await res.json()) as RawQuote;
    // Finnhub returns c=0 for unknown/unsupported symbols.
    if (!data || !data.c || data.c <= 0) return null;

    return {
      current: data.c,
      previousClose: data.pc && data.pc > 0 ? data.pc : data.c,
      timestamp: data.t ? data.t * 1000 : Date.now(),
    };
  } catch {
    // Network error, timeout, abort -> no quote available.
    return null;
  }
}
