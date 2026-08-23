import { prisma } from "../lib/prisma";
import { getPrice, getQuote } from "./marketData";

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

  const positions: PositionView[] = account.holdings.map((h) => {
    const quote = getQuote(h.symbol);
    const currentPrice = quote.price;
    const marketValue = round(currentPrice * h.quantity);
    const costBasis = round(h.avgCost * h.quantity);
    const unrealizedPL = round(marketValue - costBasis);
    const unrealizedPLPercent = costBasis ? round((unrealizedPL / costBasis) * 100) : 0;
    const dayChange = round(quote.change * h.quantity);
    return {
      symbol: h.symbol,
      name: quote.name,
      type: quote.type,
      quantity: round(h.quantity, 6),
      avgCost: round(h.avgCost, 4),
      currentPrice,
      marketValue,
      costBasis,
      unrealizedPL,
      unrealizedPLPercent,
      dayChange,
      dayChangePercent: quote.changePercent,
    };
  });

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
      investments += getPrice(h.symbol) * h.quantity;
    }
  }
  return {
    cash: round(cash),
    investments: round(investments),
    total: round(cash + investments),
  };
}
