import { SYMBOL_MAP, SYMBOLS, SymbolInfo } from "../data/symbols";
import { getRealPreviousClose, getRealPrice, hasRealData } from "./quoteCache";

/**
 * Market-data engine.
 *
 * Real quotes: when a Finnhub API key is configured, real-time stock/ETF prices
 * are served from the in-memory quote cache (see quoteCache.ts). No real money
 * is ever involved — this only affects the *prices* shown for trading.
 *
 * Simulated fallback: for crypto, when no API key is set, or when a real quote
 * is temporarily unavailable (rate limit / network), a deterministic seeded
 * random walk is used instead so the app always has believable prices.
 */

// Simple deterministic hash -> seed
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Mulberry32 PRNG for reproducible sequences
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convert uniform [0,1) to approx standard normal via Box-Muller
function randNormal(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

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

const DAY_MS = 24 * 60 * 60 * 1000;

// Round to sensible precision (crypto sub-dollar assets keep more decimals).
function roundPrice(price: number): number {
  if (price < 1) return Math.round(price * 1e6) / 1e6;
  if (price < 100) return Math.round(price * 100) / 100;
  return Math.round(price * 100) / 100;
}

// How many days of history the random walk spans. The walk restarts from
// basePrice at the start of each window so prices stay realistically anchored
// near basePrice instead of compounding drift over ~20k epoch days.
const WINDOW_DAYS = 365;

/**
 * Generate a daily closing price for the given absolute epoch day index.
 * Uses a seeded, mean-reverting random walk anchored to basePrice so the
 * series is reproducible and stays in a believable range.
 */
function dailyClose(info: SymbolInfo, dayIndex: number): number {
  // Position within the current rolling window; the walk restarts each window.
  const windowStart = Math.floor(dayIndex / WINDOW_DAYS) * WINDOW_DAYS;
  const step = dayIndex - windowStart;

  // Seed depends on the window so each year has a distinct but stable path.
  const walkRand = mulberry32(hashString(info.symbol) + windowStart * 2654435761);

  let price = info.basePrice;
  for (let i = 0; i < step; i++) {
    const shock = randNormal(walkRand) * info.volatility;
    // Mean reversion pulls price gently back toward basePrice.
    const reversion = (info.basePrice - price) / info.basePrice * 0.02;
    price = price * (1 + shock + reversion);
    // Clamp to a believable band around the reference price.
    const low = info.basePrice * 0.55;
    const high = info.basePrice * 1.8;
    if (price < low) price = low;
    if (price > high) price = high;
  }

  // Small day-stable jitter so consecutive days differ slightly.
  const dayRand = mulberry32(hashString(info.symbol) + dayIndex * 40503);
  price = price * (1 + (dayRand() - 0.5) * info.volatility * 0.3);
  return roundPrice(Math.max(price, info.basePrice * 0.05));
}

// Simulated current price: today's close plus an intraday component that
// advances with wall-clock time so the number visibly moves.
function simulatedPrice(info: SymbolInfo, at: number): number {
  const dayIndex = Math.floor(at / DAY_MS);
  const todayClose = dailyClose(info, dayIndex);

  // Intraday: seed changes every ~5s so price ticks.
  const tick = Math.floor(at / 5000);
  const rand = mulberry32(hashString(info.symbol + ":intraday") + tick);
  const intraday = (rand() - 0.5) * 2 * info.volatility * 0.4; // +/- fraction
  return roundPrice(Math.max(todayClose * (1 + intraday), info.basePrice * 0.05));
}

function simulatedPreviousClose(info: SymbolInfo, at: number): number {
  const dayIndex = Math.floor(at / DAY_MS) - 1;
  return dailyClose(info, dayIndex);
}

/**
 * Live price. Prefers a real cached quote (stocks/ETFs when a key is set),
 * otherwise falls back to the deterministic simulator.
 */
export function getPrice(symbol: string, at: number = Date.now()): number {
  const info = SYMBOL_MAP[symbol.toUpperCase()];
  if (!info) throw new Error(`Unknown symbol: ${symbol}`);

  const real = getRealPrice(info.symbol);
  if (real != null) return roundPrice(real);

  return simulatedPrice(info, at);
}

export function getPreviousClose(symbol: string, at: number = Date.now()): number {
  const info = SYMBOL_MAP[symbol.toUpperCase()];
  if (!info) throw new Error(`Unknown symbol: ${symbol}`);

  const realPc = getRealPreviousClose(info.symbol);
  if (realPc != null) return roundPrice(realPc);

  return simulatedPreviousClose(info, at);
}

export function isRealQuote(symbol: string): boolean {
  return hasRealData(symbol);
}

export function getQuote(symbol: string, at: number = Date.now()): Quote {
  const info = SYMBOL_MAP[symbol.toUpperCase()];
  if (!info) throw new Error(`Unknown symbol: ${symbol}`);
  const price = getPrice(symbol, at);
  const previousClose = getPreviousClose(symbol, at);
  const change = roundPrice(price - previousClose);
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;
  return {
    symbol: info.symbol,
    name: info.name,
    type: info.type,
    price,
    previousClose,
    change,
    changePercent: Math.round(changePercent * 100) / 100,
    source: hasRealData(info.symbol) ? "real" : "simulated",
    updatedAt: new Date(at).toISOString(),
  };
}

export function getQuotes(symbols: string[], at: number = Date.now()): Quote[] {
  return symbols
    .filter((s) => SYMBOL_MAP[s.toUpperCase()])
    .map((s) => getQuote(s, at));
}

export function getAllQuotes(at: number = Date.now()): Quote[] {
  return SYMBOLS.map((s) => getQuote(s.symbol, at));
}

/**
 * Historical daily series for a range. `range` in trading-ish days.
 */
function simulatedHistory(info: SymbolInfo, days: number, at: number): Candle[] {
  const todayIndex = Math.floor(at / DAY_MS);

  // The simulated series is anchored to basePrice. When we have a real live
  // price, scale the historical curve so its last point matches the real
  // quote — this keeps the chart visually consistent with the shown price.
  const realPrice = getRealPrice(info.symbol);
  const simToday = simulatedPrice(info, at);
  const scale = realPrice != null && simToday > 0 ? realPrice / simToday : 1;

  const out: Candle[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayIndex = todayIndex - i;
    out.push({ t: dayIndex * DAY_MS, price: roundPrice(dailyClose(info, dayIndex) * scale) });
  }
  out.push({ t: at, price: getPrice(info.symbol, at) });
  return out;
}

/**
 * Historical daily series. Prefers real candles from Twelve Data (cached);
 * falls back to the simulated series (anchored to the real price when known).
 */
export async function getHistory(
  symbol: string,
  days: number,
  at: number = Date.now()
): Promise<Candle[]> {
  const info = SYMBOL_MAP[symbol.toUpperCase()];
  if (!info) throw new Error(`Unknown symbol: ${symbol}`);

  // Lazy import to avoid a circular module dependency at load time.
  const { getRealHistory } = await import("./historyCache");
  const real = await getRealHistory(info.symbol, days);
  if (real && real.length > 1) {
    // Append the freshest live price as the final point if it's newer.
    const livePrice = getPrice(info.symbol, at);
    const last = real[real.length - 1];
    if (at - last.t > 60 * 1000) {
      return [...real, { t: at, price: livePrice }];
    }
    return real;
  }

  return simulatedHistory(info, days, at);
}

export function searchSymbols(query: string): SymbolInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return SYMBOLS.slice(0, 20);
  return SYMBOLS.filter(
    (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  ).slice(0, 25);
}
