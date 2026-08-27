import { prisma } from "../lib/prisma";
import { config } from "../lib/config";

/**
 * Dynamic symbol layer (search-only, no static universe).
 *
 * Responsibilities:
 *  - Search any real symbol via Finnhub's /search endpoint.
 *  - Detect asset type (STOCK / ETF / CRYPTO) and map to each provider's
 *    ticker format.
 *  - Persist + cache lightweight metadata (name, assetType) in the SymbolMeta
 *    table so portfolio/watchlist rows can render without a live lookup.
 */

export type AssetType = "STOCK" | "ETF" | "CRYPTO";

export interface SymbolMetaInfo {
  symbol: string;
  name: string;
  type: AssetType;
}

// A small set of well-known crypto tickers so we can detect crypto without a
// static universe. Anything a user searches that resolves as crypto via the
// provider is also treated as crypto; this list just covers bare tickers a
// user might type directly (e.g. "BTC").
const KNOWN_CRYPTO = new Set([
  "BTC", "ETH", "SOL", "DOGE", "ADA", "XRP", "LTC", "BCH", "DOT", "AVAX",
  "MATIC", "LINK", "UNI", "ATOM", "XLM", "ETC", "FIL", "APT", "ARB", "OP",
  "SHIB", "TRX", "NEAR", "ALGO", "AAVE",
]);

export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export function isCryptoSymbol(symbol: string): boolean {
  return KNOWN_CRYPTO.has(normalizeSymbol(symbol));
}

// Finnhub expects plain US tickers (1:1 with what users type).
export function toFinnhubSymbol(symbol: string): string {
  return normalizeSymbol(symbol);
}

// Twelve Data quotes crypto against USD, e.g. "BTC/USD"; stocks/ETFs use the
// plain ticker.
export function toTwelveDataSymbol(symbol: string): string {
  const s = normalizeSymbol(symbol);
  return isCryptoSymbol(s) ? `${s}/USD` : s;
}

// ── In-memory metadata cache (backed by SymbolMeta table) ────────────────────

const metaCache = new Map<string, SymbolMetaInfo>();

/** Read metadata from memory, falling back to the DB. */
export async function getSymbolMeta(symbol: string): Promise<SymbolMetaInfo | null> {
  const s = normalizeSymbol(symbol);
  const cached = metaCache.get(s);
  if (cached) return cached;

  const row = await prisma.symbolMeta.findUnique({ where: { symbol: s } });
  if (!row) return null;
  const info: SymbolMetaInfo = { symbol: row.symbol, name: row.name, type: row.assetType as AssetType };
  metaCache.set(s, info);
  return info;
}

/** Synchronous best-effort read (memory only) for hot paths that already warmed it. */
export function getSymbolMetaSync(symbol: string): SymbolMetaInfo | null {
  return metaCache.get(normalizeSymbol(symbol)) ?? null;
}

/** Persist/refresh metadata for a symbol we've resolved. */
export async function upsertSymbolMeta(info: SymbolMetaInfo): Promise<void> {
  const s = normalizeSymbol(info.symbol);
  const record: SymbolMetaInfo = { symbol: s, name: info.name || s, type: info.type };
  metaCache.set(s, record);
  await prisma.symbolMeta.upsert({
    where: { symbol: s },
    create: { symbol: s, name: record.name, assetType: record.type },
    update: { name: record.name, assetType: record.type },
  });
}

/**
 * Best-effort display name/type for a symbol without hitting the network:
 * memory cache → sensible default. Used when we have a price but no metadata
 * yet (we still persist proper metadata opportunistically elsewhere).
 */
export function fallbackMeta(symbol: string): SymbolMetaInfo {
  const s = normalizeSymbol(symbol);
  return {
    symbol: s,
    name: getSymbolMetaSync(s)?.name || s,
    type: getSymbolMetaSync(s)?.type || (isCryptoSymbol(s) ? "CRYPTO" : "STOCK"),
  };
}

// ── Live search (Finnhub /search, Twelve Data fallback) ──────────────────────

interface FinnhubSearchResult {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string; // e.g. "Common Stock", "ETP"
  }>;
}

function classifyFinnhubType(rawType: string, symbol: string): AssetType {
  if (isCryptoSymbol(symbol)) return "CRYPTO";
  const t = (rawType || "").toLowerCase();
  if (t.includes("etf") || t.includes("etp") || t.includes("fund")) return "ETF";
  return "STOCK";
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Search for symbols matching a free-text query. Returns real, tradeable
 * tickers from the provider (US equities/ETFs, plus common crypto). Results
 * are lightly de-duped and capped.
 */
export async function searchSymbols(query: string): Promise<SymbolMetaInfo[]> {
  const q = query.trim();
  if (!q) return [];

  const out: SymbolMetaInfo[] = [];
  const seen = new Set<string>();

  // Finnhub symbol search (covers stocks + ETFs).
  if (config.finnhubApiKey) {
    const data = (await fetchJson(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${encodeURIComponent(
        config.finnhubApiKey
      )}`
    )) as FinnhubSearchResult | null;

    if (data?.result?.length) {
      for (const r of data.result) {
        // Skip tickers with exchange suffixes/dots that aren't simple US symbols,
        // to keep results tradeable against the quote endpoint.
        const sym = normalizeSymbol(r.symbol);
        if (!sym || seen.has(sym)) continue;
        if (sym.includes(".") && !sym.endsWith(".B")) continue; // allow BRK.B style
        if (/[^A-Z0-9.\-]/.test(sym)) continue;
        seen.add(sym);
        out.push({
          symbol: sym,
          name: r.description || sym,
          type: classifyFinnhubType(r.type, sym),
        });
        if (out.length >= 25) break;
      }
    }
  }

  // Ensure a directly-typed crypto ticker always shows up even if search missed it.
  const upper = normalizeSymbol(q);
  if (isCryptoSymbol(upper) && !seen.has(upper)) {
    out.unshift({ symbol: upper, name: cryptoName(upper), type: "CRYPTO" });
  }

  return out.slice(0, 25);
}

function cryptoName(symbol: string): string {
  const names: Record<string, string> = {
    BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", DOGE: "Dogecoin", ADA: "Cardano",
    XRP: "XRP", LTC: "Litecoin", BCH: "Bitcoin Cash", DOT: "Polkadot", AVAX: "Avalanche",
  };
  return names[normalizeSymbol(symbol)] || normalizeSymbol(symbol);
}
