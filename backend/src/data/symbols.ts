export type AssetType = "STOCK" | "ETF" | "CRYPTO";

export interface SymbolInfo {
  symbol: string;
  name: string;
  type: AssetType;
  basePrice: number; // reference price used to seed the simulation
  volatility: number; // daily-ish volatility factor
}

// A curated universe similar to what Wealthsimple offers: popular stocks, ETFs, and crypto.
export const SYMBOLS: SymbolInfo[] = [
  { symbol: "AAPL", name: "Apple Inc.", type: "STOCK", basePrice: 227.5, volatility: 0.018 },
  { symbol: "MSFT", name: "Microsoft Corporation", type: "STOCK", basePrice: 418.2, volatility: 0.016 },
  { symbol: "GOOGL", name: "Alphabet Inc.", type: "STOCK", basePrice: 168.9, volatility: 0.02 },
  { symbol: "AMZN", name: "Amazon.com, Inc.", type: "STOCK", basePrice: 185.4, volatility: 0.022 },
  { symbol: "NVDA", name: "NVIDIA Corporation", type: "STOCK", basePrice: 128.7, volatility: 0.03 },
  { symbol: "TSLA", name: "Tesla, Inc.", type: "STOCK", basePrice: 242.1, volatility: 0.035 },
  { symbol: "META", name: "Meta Platforms, Inc.", type: "STOCK", basePrice: 512.3, volatility: 0.024 },
  { symbol: "SHOP", name: "Shopify Inc.", type: "STOCK", basePrice: 78.6, volatility: 0.03 },
  { symbol: "BRK.B", name: "Berkshire Hathaway Inc.", type: "STOCK", basePrice: 452.8, volatility: 0.012 },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", type: "STOCK", basePrice: 214.5, volatility: 0.015 },
  { symbol: "V", name: "Visa Inc.", type: "STOCK", basePrice: 276.4, volatility: 0.013 },
  { symbol: "DIS", name: "The Walt Disney Company", type: "STOCK", basePrice: 91.2, volatility: 0.02 },
  { symbol: "NFLX", name: "Netflix, Inc.", type: "STOCK", basePrice: 685.9, volatility: 0.025 },
  { symbol: "AMD", name: "Advanced Micro Devices, Inc.", type: "STOCK", basePrice: 148.3, volatility: 0.032 },
  { symbol: "COIN", name: "Coinbase Global, Inc.", type: "STOCK", basePrice: 215.7, volatility: 0.04 },

  { symbol: "VFV", name: "Vanguard S&P 500 Index ETF", type: "ETF", basePrice: 134.2, volatility: 0.01 },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", type: "ETF", basePrice: 512.6, volatility: 0.01 },
  { symbol: "QQQ", name: "Invesco QQQ Trust", type: "ETF", basePrice: 486.3, volatility: 0.014 },
  { symbol: "XEQT", name: "iShares Core Equity ETF Portfolio", type: "ETF", basePrice: 32.8, volatility: 0.009 },
  { symbol: "VDY", name: "Vanguard FTSE Canadian High Dividend ETF", type: "ETF", basePrice: 44.1, volatility: 0.008 },

  { symbol: "BTC", name: "Bitcoin", type: "CRYPTO", basePrice: 62150.0, volatility: 0.045 },
  { symbol: "ETH", name: "Ethereum", type: "CRYPTO", basePrice: 3410.0, volatility: 0.05 },
  { symbol: "SOL", name: "Solana", type: "CRYPTO", basePrice: 146.5, volatility: 0.06 },
  { symbol: "DOGE", name: "Dogecoin", type: "CRYPTO", basePrice: 0.112, volatility: 0.07 },
  { symbol: "ADA", name: "Cardano", type: "CRYPTO", basePrice: 0.386, volatility: 0.06 },
];

export const SYMBOL_MAP: Record<string, SymbolInfo> = Object.fromEntries(
  SYMBOLS.map((s) => [s.symbol, s])
);

export function isValidSymbol(symbol: string): boolean {
  return Boolean(SYMBOL_MAP[symbol.toUpperCase()]);
}

// Stocks & ETFs get real-time quotes from Finnhub's free /quote endpoint.
export function supportsFinnhubQuote(symbol: string): boolean {
  const info = SYMBOL_MAP[symbol.toUpperCase()];
  return Boolean(info && (info.type === "STOCK" || info.type === "ETF"));
}

// Crypto gets real quotes + history from Twelve Data (Finnhub free excludes it).
export function isCrypto(symbol: string): boolean {
  const info = SYMBOL_MAP[symbol.toUpperCase()];
  return Boolean(info && info.type === "CRYPTO");
}

// Map our display symbol to the ticker Finnhub expects (1:1 for US tickers).
export function toFinnhubSymbol(symbol: string): string {
  return symbol.toUpperCase();
}

// Map our display symbol to Twelve Data's format. Crypto is quoted against USD
// as e.g. "BTC/USD"; stocks/ETFs use the plain ticker.
export function toTwelveDataSymbol(symbol: string): string {
  const info = SYMBOL_MAP[symbol.toUpperCase()];
  if (info && info.type === "CRYPTO") return `${info.symbol}/USD`;
  return symbol.toUpperCase();
}
