import { prisma } from "./lib/prisma";
import { hashPassword } from "./lib/auth";
import { getPrice } from "./services/marketData";

async function main() {
  const email = "demo@wealthsimple.dev";
  const password = "password123";

  // Clean slate for the demo user.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: "Demo",
      lastName: "Investor",
      accounts: {
        create: [
          { type: "PERSONAL", name: "Personal", cashBalance: 10000 },
          { type: "TFSA", name: "TFSA", cashBalance: 25000 },
        ],
      },
      watchlist: {
        create: [{ symbol: "AAPL" }, { symbol: "NVDA" }, { symbol: "BTC" }, { symbol: "VFV" }],
      },
    },
    include: { accounts: true },
  });

  const personal = user.accounts.find((a) => a.type === "PERSONAL")!;
  const tfsa = user.accounts.find((a) => a.type === "TFSA")!;

  // Seed some positions with realistic average costs and matching cash/ledger entries.
  const seedPositions: Array<{ accountId: string; symbol: string; qty: number }> = [
    { accountId: personal.id, symbol: "AAPL", qty: 10 },
    { accountId: personal.id, symbol: "TSLA", qty: 5 },
    { accountId: tfsa.id, symbol: "VFV", qty: 50 },
    { accountId: tfsa.id, symbol: "NVDA", qty: 8 },
    { accountId: tfsa.id, symbol: "BTC", qty: 0.05 },
  ];

  for (const p of seedPositions) {
    const price = getPrice(p.symbol);
    const cost = Math.round(price * p.qty * 100) / 100;
    // Buy slightly below current to show a small gain.
    const avgCost = Math.round(price * 0.96 * 100) / 100;
    await prisma.holding.create({
      data: { accountId: p.accountId, symbol: p.symbol, quantity: p.qty, avgCost },
    });
    await prisma.transaction.create({
      data: {
        accountId: p.accountId,
        type: "BUY",
        symbol: p.symbol,
        quantity: p.qty,
        price: avgCost,
        amount: -Math.round(avgCost * p.qty * 100) / 100,
        note: `Seeded position: ${p.qty} ${p.symbol}`,
      },
    });
  }

  console.log("Seeded demo user:");
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
