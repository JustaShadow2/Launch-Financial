import { Router } from "express";
import { requireAuth, asyncHandler } from "../middleware/authMiddleware";
import {
  getAllQuotes,
  getHistory,
  getQuote,
  getQuotes,
  searchSymbols,
} from "../services/marketData";
import { isValidSymbol } from "../data/symbols";

export const marketRouter = Router();

marketRouter.use(requireAuth);

// Search the symbol universe.
marketRouter.get(
  "/search",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "");
    res.json({ results: searchSymbols(q) });
  })
);

// All quotes (for market/discover views).
marketRouter.get(
  "/quotes",
  asyncHandler(async (req, res) => {
    const symbolsParam = req.query.symbols ? String(req.query.symbols) : "";
    if (symbolsParam) {
      const symbols = symbolsParam.split(",").map((s) => s.trim());
      return res.json({ quotes: getQuotes(symbols) });
    }
    res.json({ quotes: getAllQuotes() });
  })
);

// Single quote.
marketRouter.get(
  "/quote/:symbol",
  asyncHandler(async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    if (!isValidSymbol(symbol)) return res.status(404).json({ error: "Unknown symbol" });
    res.json({ quote: getQuote(symbol) });
  })
);

// Price history. ?range=1M|3M|6M|1Y
marketRouter.get(
  "/history/:symbol",
  asyncHandler(async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    if (!isValidSymbol(symbol)) return res.status(404).json({ error: "Unknown symbol" });
    const range = String(req.query.range || "1M");
    const days = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 }[range] || 30;
    res.json({ symbol, range, candles: await getHistory(symbol, days) });
  })
);
