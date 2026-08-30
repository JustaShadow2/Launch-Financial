/**
 * Curated lists of well-known, actively-traded symbols shown as "Popular" on
 * the Market page. These are NOT a live most-active feed (that's a premium
 * feature on the data providers we use); they're a hand-picked set of widely
 * held names so the Market page always has something to show. Live quotes for
 * these are fetched on demand like any other symbol.
 */

export const POPULAR_STOCKS: string[] = [
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AMD", "NFLX", "JPM",
];

export const POPULAR_ETFS: string[] = [
  "SPY", "QQQ", "VOO", "VTI", "IWM", "DIA", "ARKK", "XLK",
];

export const POPULAR_CRYPTO: string[] = [
  "BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK",
];

export const POPULAR_BY_CATEGORY: Record<string, string[]> = {
  STOCK: POPULAR_STOCKS,
  ETF: POPULAR_ETFS,
  CRYPTO: POPULAR_CRYPTO,
};
