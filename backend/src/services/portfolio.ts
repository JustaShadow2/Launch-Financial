import { prisma } from "../lib/prisma";
import { getQuote } from "./marketData";
import { fallbackMeta, getSymbolMeta } from "./symbols";

function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

export interface PositionView {
  symbol: string;
  name: string;
  type: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

export interface AccountSummary {
  accountId: string;
  name: string;
  type: string;
  cashBalance: number;
  investmentsValue: number;
  totalValue: number;
  totalCostBasis: number;
  totalUnrealizedPL: number;
  totalUnrealizedPLPercent: number;
  positions: PositionView[];
}

export async function getAccountSummary(accountId: string, userId: string): Promise<AccountSummary> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    include: { holdings: true },
  });
  if (!account) {
    const err = new Error("Account not found") as Error & { status?: number };
    err.status = 404;
    throw err;
  }

  const positions: PositionView[] = await Promise.all(
    account.holdings.map(async (h) => {
      // Try for a live quote. If the provider is momentarily unavailable, fall
      // back to the position's cost basis so the portfolio still renders.
      let currentPrice = h.avgCost;
      let change = 0;
      let changePercent = 0;
      const meta = (await getSymbolMeta(h.symbol)) ?? fallbackMeta(h.symbol);
      let name: string = meta.name;
      let type: string = meta.type;
      try {
        const quote = await getQuote(h.symbol);
        currentPrice = quote.price;
        change = quote.change;
        changePercent = quote.changePercent;
        name = quote.name;
        type = quote.type;
      } catch {
        // Keep cost-basis fallback values.
      }

      const marketValue = round(currentPrice * h.quantity);
      const costBasis = round(h.avgCost * h.quantity);
      const unrealizedPL = round(marketValue - costBasis);
      const unrealizedPLPercent = costBasis ? round((unrealizedPL / costBasis) * 100) : 0;
      const dayChange = round(change * h.quantity);
      return {
        symbol: h.symbol,
        name,
        type,
        quantity: round(h.quantity, 6),
        avgCost: round(h.avgCost, 4),
        currentPrice,
        marketValue,
        costBasis,
        unrealizedPL,
        unrealizedPLPercent,
        dayChange,
        dayChangePercent: changePercent,
      };
    })
  );

  const investmentsValue = round(positions.reduce((s, p) => s + p.marketValue, 0));
  const totalCostBasis = round(positions.reduce((s, p) => s + p.costBasis, 0));
  const totalUnrealizedPL = round(positions.reduce((s, p) => s + p.unrealizedPL, 0));
  const totalValue = round(account.cashBalance + investmentsValue);
  const totalUnrealizedPLPercent = totalCostBasis
    ? round((totalUnrealizedPL / totalCostBasis) * 100)
    : 0;

  return {
    accountId: account.id,
    name: account.name,
    type: account.type,
    cashBalance: round(account.cashBalance),
    investmentsValue,
    totalValue,
    totalCostBasis,
    totalUnrealizedPL,
    totalUnrealizedPLPercent,
    positions: positions.sort((a, b) => b.marketValue - a.marketValue),
  };
}

export async function getNetWorth(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    include: { holdings: true },
  });

  let cash = 0;
  let investments = 0;
  for (const acc of accounts) {
    cash += acc.cashBalance;
    for (const h of acc.holdings) {
      let price = h.avgCost; // fallback if a live quote is unavailable
      try {
        const quote = await getQuote(h.symbol);
        price = quote.price;
      } catch {
        // keep cost-basis fallback
      }
      investments += price * h.quantity;
    }
  }
  return {
    cash: round(cash),
    investments: round(investments),
    total: round(cash + investments),
  };
}

// ── Net-worth history (reconstructed from the transaction ledger) ─────────────

export interface NetWorthPoint {
  t: number; // epoch ms (start of day, UTC)
  value: number; // total net worth on that day
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Reconstruct daily total net worth over the trailing `days`.
 *
 * The transaction ledger is the source of truth for cash flows and share
 * counts: DEPOSIT/WITHDRAWAL move cash; BUY/SELL move cash and shares. For
 * each day we compute:
 *   cash(day)        = sum of signed transaction amounts up to end of day
 *   shares[sym](day) = net BUY/SELL quantity up to end of day
 *   value(day)       = cash(day) + Σ shares[sym](day) × price[sym](day)
 *
 * Prices come from each symbol's historical series (Twelve Data, cached), with
 * the latest known price carried forward for days a candle is missing. If no
 * history is available for a symbol, its current price is used as a flat line.
 */
export async function getNetWorthHistory(userId: string, days: number): Promise<NetWorthPoint[]> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true },
  });
  const accountIds = accounts.map((a) => a.id);
  if (accountIds.length === 0) return [];

  const txns = await prisma.transaction.findMany({
    where: { accountId: { in: accountIds } },
    orderBy: { createdAt: "asc" },
  });
  if (txns.length === 0) return [];

  const { getHistory } = await import("./marketData");

  const todayIndex = Math.floor(Date.now() / DAY_MS);
  const startIndex = todayIndex - (days - 1);

  // Distinct symbols the user has ever traded.
  const symbols = Array.from(
    new Set(txns.filter((t) => t.symbol).map((t) => t.symbol as string))
  );

  // Build a day-indexed price lookup per symbol (carry forward last known).
  const priceBySymbolDay = new Map<string, Map<number, number>>();
  await Promise.all(
    symbols.map(async (sym) => {
      const dayPrices = new Map<number, number>();
      try {
        const candles = await getHistory(sym, days + 5);
        for (const c of candles) {
          dayPrices.set(Math.floor(c.t / DAY_MS), c.price);
        }
      } catch {
        // leave empty; we'll fall back to current price below
      }
      if (dayPrices.size === 0) {
        // No history — use the current price as a flat reference.
        try {
          const q = await getQuote(sym);
          dayPrices.set(todayIndex, q.price);
        } catch {
          /* symbol unpriceable right now */
        }
      }
      priceBySymbolDay.set(sym, dayPrices);
    })
  );

  function priceOn(sym: string, dayIdx: number): number {
    const m = priceBySymbolDay.get(sym);
    if (!m || m.size === 0) return 0;
    // Find the latest known price at or before dayIdx (carry forward).
    for (let d = dayIdx; d >= dayIdx - 400; d--) {
      const p = m.get(d);
      if (p != null) return p;
    }
    // Otherwise use the earliest known price (backfill for days before history).
    let earliestDay = Infinity;
    let earliestPrice = 0;
    for (const [d, p] of m) {
      if (d < earliestDay) {
        earliestDay = d;
        earliestPrice = p;
      }
    }
    return earliestPrice;
  }

  const out: NetWorthPoint[] = [];
  for (let dayIdx = startIndex; dayIdx <= todayIndex; dayIdx++) {
    const endOfDay = (dayIdx + 1) * DAY_MS - 1;

    // Cash + share counts from all transactions up to end of this day.
    let cash = 0;
    const shares = new Map<string, number>();
    for (const t of txns) {
      if (t.createdAt.getTime() > endOfDay) break; // txns are asc-ordered
      cash += t.amount; // signed: deposits +, withdrawals/buys -, sells +
      if (t.symbol && t.quantity != null) {
        const delta = t.type === "BUY" ? t.quantity : t.type === "SELL" ? -t.quantity : 0;
        if (delta !== 0) shares.set(t.symbol, (shares.get(t.symbol) ?? 0) + delta);
      }
    }

    let holdingsValue = 0;
    for (const [sym, qty] of shares) {
      if (qty <= 1e-9) continue;
      holdingsValue += qty * priceOn(sym, dayIdx);
    }

    out.push({ t: dayIdx * DAY_MS, value: round(cash + holdingsValue) });
  }

  return out;
}
