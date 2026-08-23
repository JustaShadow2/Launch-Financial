import { config } from "../lib/config";
import { toTwelveDataSymbol } from "../data/symbols";

/**
 * Client for Twelve Data (free tier). Used for:
 *  - Real crypto quotes (Finnhub's free tier excludes crypto).
 *  - Real historical daily candles for any supported symbol.
 *
 * Docs: https://twelvedata.com/docs
 * Free tier: 8 requests/min, 800 requests/day.
 */

const BASE = "https://api.twelvedata.com";

export function isConfigured(): boolean {
  return Boolean(config.twelveDataApiKey);
}

async function getJson(url: string): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: string; code?: number } & Record<string, unknown>;
    // Twelve Data signals problems with { status: "error", ... } or { code: 429 }.
    if (data && (data.status === "error" || data.code === 429)) return null;
    return data;
  } catch {
    return null;
  }
}

export interface TdQuote {
  price: number;
  previousClose: number;
}

/**
 * Latest price for a symbol. Also fetches the previous daily close (via a tiny
 * 2-row time series) so we can compute the day's change for crypto.
 */
export async function fetchQuote(symbol: string): Promise<TdQuote | null> {
  if (!isConfigured()) return null;
  const td = toTwelveDataSymbol(symbol);
  const key = encodeURIComponent(config.twelveDataApiKey);

  const priceData = await getJson(
    `${BASE}/price?symbol=${encodeURIComponent(td)}&apikey=${key}`
  );
  const price = priceData ? parseFloat(priceData.price) : NaN;
  if (!isFinite(price) || price <= 0) return null;

  // Previous close from the last two daily candles.
  let previousClose = price;
  const series = await getJson(
    `${BASE}/time_series?symbol=${encodeURIComponent(td)}&interval=1day&outputsize=2&apikey=${key}`
  );
  const values = series?.values;
  if (Array.isArray(values) && values.length >= 2) {
    const pc = parseFloat(values[1].close);
    if (isFinite(pc) && pc > 0) previousClose = pc;
  }

  return { price, previousClose };
}

export interface TdCandle {
  t: number; // epoch ms
  price: number;
}

/**
 * Daily historical candles, oldest-first. Returns null on any failure so the
 * caller can fall back to the simulator.
 */
export async function fetchDailySeries(symbol: string, days: number): Promise<TdCandle[] | null> {
  if (!isConfigured()) return null;
  const td = toTwelveDataSymbol(symbol);
  const key = encodeURIComponent(config.twelveDataApiKey);
  const outputsize = Math.min(Math.max(days, 1), 5000);

  const data = await getJson(
    `${BASE}/time_series?symbol=${encodeURIComponent(
      td
    )}&interval=1day&outputsize=${outputsize}&apikey=${key}`
  );
  const values = data?.values;
  if (!Array.isArray(values) || values.length === 0) return null;

  // Twelve Data returns newest-first; reverse to oldest-first for charting.
  const candles: TdCandle[] = values
    .map((v: { datetime: string; close: string }) => ({
      t: new Date(v.datetime).getTime(),
      price: parseFloat(v.close),
    }))
    .filter((c: TdCandle) => isFinite(c.t) && isFinite(c.price) && c.price > 0)
    .reverse();

  return candles.length ? candles : null;
}
