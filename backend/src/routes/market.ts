import { Router } from "express";
import { requireAuth, asyncHandler, AuthedRequest } from "../middleware/authMiddleware";
import {
  getHistory,
  getQuote,
  getQuotes,
  rangeToDays,
  searchSymbols,
  UnknownSymbolError,
} from "../services/marketData";
import { normalizeSymbol, upsertSymbolMeta } from "../services/symbols";
import { POPULAR_BY_CATEGORY } from "../data/popularSymbols";
import { prisma } from "../lib/prisma";

export const marketRouter = Router();

marketRouter.use(requireAuth);

// Dynamic symbol search (any real ticker).
marketRouter.get(
  "/search",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "");
    res.json({ results: await searchSymbols(q) });
  })
);

// Quotes for a set of symbols (?symbols=AAPL,MSFT). With no param, returns the
// caller's watchlist quotes as a sensible default for discover views. (There is
// no fixed universe anymore — browse by searching.)
marketRouter.get(
  "/quotes",
  asyncHandler(async (req: AuthedRequest, res) => {
    const symbolsParam = req.query.symbols ? String(req.query.symbols) : "";
    if (symbolsParam) {
      const symbols = symbolsParam.split(",").map((s) => s.trim()).filter(Boolean);
      return res.json({ quotes: await getQuotes(symbols) });
    }
    const items = await prisma.watchlistItem.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ quotes: await getQuotes(items.map((i) => i.symbol)) });
  })
);

// Popular symbols by category (curated lists), with live quotes. Returns one
// group per category so the Market page can render Stocks / ETFs / Crypto
// sections. Symbols that can't be priced right now are simply omitted.
marketRouter.get(
  "/popular",
  asyncHandler(async (_req, res) => {
    const groups = await Promise.all(
      Object.entries(POPULAR_BY_CATEGORY).map(async ([category, symbols]) => {
        const quotes = await getQuotes(symbols);
        // Force the curated category so grouping is always correct (e.g. an
        // ETF that a provider labels ambiguously still lands under ETF), and
        // persist that metadata for future lookups.
        const typed = quotes.map((q) => {
          if (q.type !== category) {
            upsertSymbolMeta({ symbol: q.symbol, name: q.name, type: category as any }).catch(() => {});
          }
          return { ...q, type: category };
        });
        // Preserve the curated ordering.
        typed.sort((a, b) => symbols.indexOf(a.symbol) - symbols.indexOf(b.symbol));
        return { category, quotes: typed };
      })
    );
    res.json({ groups });
  })
);

// Single quote. Any real symbol resolves; unknown ones 404.
marketRouter.get(
  "/quote/:symbol",
  asyncHandler(async (req, res) => {
    const symbol = normalizeSymbol(req.params.symbol);
    try {
      res.json({ quote: await getQuote(symbol) });
    } catch (e) {
      if (e instanceof UnknownSymbolError) return res.status(404).json({ error: "Unknown symbol" });
      throw e;
    }
  })
);

// Price history. ?range=1W|1M|3M|6M|1Y
marketRouter.get(
  "/history/:symbol",
  asyncHandler(async (req, res) => {
    const symbol = normalizeSymbol(req.params.symbol);
    const range = String(req.query.range || "1M");
    const candles = await getHistory(symbol, rangeToDays(range));
    res.json({ symbol, range, candles });
  })
);
