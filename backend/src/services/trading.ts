import { prisma } from "../lib/prisma";
import { getQuote, UnknownSymbolError } from "./marketData";
import { normalizeSymbol } from "./symbols";

export class TradeError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Resolve a live tradeable price for a symbol. A successful quote also acts as
 * validation (any real symbol works; unknown ones throw). getQuote persists
 * the symbol's metadata so positions render with a proper name/type.
 */
async function priceFor(symbol: string): Promise<number> {
  try {
    const quote = await getQuote(symbol);
    return quote.price;
  } catch (e) {
    if (e instanceof UnknownSymbolError) {
      throw new TradeError(`No market data available for ${symbol}. Check the symbol and try again.`);
    }
    throw e;
  }
}

interface TradeInput {
  accountId: string;
  userId: string;
  symbol: string;
  quantity: number;
}

async function getOwnedAccount(accountId: string, userId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) throw new TradeError("Account not found", 404);
  return account;
}

// Round money to cents; quantities can be fractional (like Wealthsimple).
function money(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function executeBuy({ accountId, userId, symbol, quantity }: TradeInput) {
  symbol = normalizeSymbol(symbol);
  if (!(quantity > 0)) throw new TradeError("Quantity must be greater than 0");

  const account = await getOwnedAccount(accountId, userId);
  const price = await priceFor(symbol);
  const cost = money(price * quantity);

  if (cost > account.cashBalance + 1e-9) {
    throw new TradeError(
      `Insufficient funds. Cost $${cost.toFixed(2)} exceeds cash balance $${account.cashBalance.toFixed(2)}`
    );
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.holding.findUnique({
      where: { accountId_symbol: { accountId, symbol } },
    });

    if (existing) {
      const newQty = existing.quantity + quantity;
      const newAvg = (existing.avgCost * existing.quantity + price * quantity) / newQty;
      await tx.holding.update({
        where: { id: existing.id },
        data: { quantity: newQty, avgCost: newAvg },
      });
    } else {
      await tx.holding.create({
        data: { accountId, symbol, quantity, avgCost: price },
      });
    }

    await tx.account.update({
      where: { id: accountId },
      data: { cashBalance: money(account.cashBalance - cost) },
    });

    await tx.transaction.create({
      data: {
        accountId,
        type: "BUY",
        symbol,
        quantity,
        price,
        amount: -cost,
        note: `Bought ${quantity} ${symbol} @ $${price}`,
      },
    });

    const order = await tx.order.create({
      data: {
        accountId,
        symbol,
        side: "BUY",
        type: "MARKET",
        quantity,
        status: "FILLED",
        filledPrice: price,
      },
    });

    return { order, price, cost };
  });
}

export async function executeSell({ accountId, userId, symbol, quantity }: TradeInput) {
  symbol = normalizeSymbol(symbol);
  if (!(quantity > 0)) throw new TradeError("Quantity must be greater than 0");

  const account = await getOwnedAccount(accountId, userId);
  const holding = await prisma.holding.findUnique({
    where: { accountId_symbol: { accountId, symbol } },
  });

  if (!holding || holding.quantity + 1e-9 < quantity) {
    throw new TradeError(
      `Not enough shares. You hold ${holding?.quantity ?? 0} ${symbol}`
    );
  }

  const price = await priceFor(symbol);
  const proceeds = money(price * quantity);

  return prisma.$transaction(async (tx) => {
    const remaining = holding.quantity - quantity;
    if (remaining <= 1e-9) {
      await tx.holding.delete({ where: { id: holding.id } });
    } else {
      await tx.holding.update({
        where: { id: holding.id },
        data: { quantity: remaining }, // avgCost unchanged on sell
      });
    }

    await tx.account.update({
      where: { id: accountId },
      data: { cashBalance: money(account.cashBalance + proceeds) },
    });

    await tx.transaction.create({
      data: {
        accountId,
        type: "SELL",
        symbol,
        quantity,
        price,
        amount: proceeds,
        note: `Sold ${quantity} ${symbol} @ $${price}`,
      },
    });

    const order = await tx.order.create({
      data: {
        accountId,
        symbol,
        side: "SELL",
        type: "MARKET",
        quantity,
        status: "FILLED",
        filledPrice: price,
      },
    });

    return { order, price, proceeds };
  });
}
