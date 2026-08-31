import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, requireAuth, AuthedRequest } from "../middleware/authMiddleware";
import { getAccountSummary, getNetWorth, getNetWorthHistory } from "../services/portfolio";

export const accountsRouter = Router();

accountsRouter.use(requireAuth);

const VALID_TYPES = ["PERSONAL", "TFSA", "RRSP", "CRYPTO"] as const;

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

// List all accounts for the user with summary values.
accountsRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const accounts = await prisma.account.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "asc" },
    });
    const summaries = await Promise.all(
      accounts.map((a) => getAccountSummary(a.id, req.userId!))
    );
    res.json({ accounts: summaries });
  })
);

// Net worth across all accounts.
accountsRouter.get(
  "/net-worth",
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await getNetWorth(req.userId!));
  })
);

// Net-worth history over time for the home chart. ?range=1W|1M|3M|1Y|ALL
accountsRouter.get(
  "/net-worth/history",
  asyncHandler(async (req: AuthedRequest, res) => {
    const range = String(req.query.range || "1M").toUpperCase();
    const rangeDays: Record<string, number> = {
      "1W": 7,
      "1M": 30,
      "3M": 90,
      "1Y": 365,
      ALL: 1095, // up to ~3 years; reconstruction stops at the first transaction
    };
    const days = rangeDays[range] || 30;
    const points = await getNetWorthHistory(req.userId!, days);
    res.json({ range, points });
  })
);

// Create an additional account (e.g. TFSA/RRSP/Crypto).
const createSchema = z.object({
  type: z.enum(VALID_TYPES),
  name: z.string().min(1).optional(),
});

accountsRouter.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const { type } = parsed.data;
    const name = parsed.data.name || defaultName(type);
    const account = await prisma.account.create({
      data: { userId: req.userId!, type, name, cashBalance: 0 },
    });
    res.status(201).json({ account });
  })
);

// Detailed summary for one account.
accountsRouter.get(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const summary = await getAccountSummary(req.params.id, req.userId!);
    res.json(summary);
  })
);

// --- Funding: mock add money / withdraw ---
const fundSchema = z.object({
  amount: z.number().positive().max(1_000_000, "Max $1,000,000 per mock deposit"),
});

accountsRouter.post(
  "/:id/deposit",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = fundSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const account = await prisma.account.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!account) return res.status(404).json({ error: "Account not found" });

    const amount = money(parsed.data.amount);
    const updated = await prisma.$transaction(async (tx) => {
      const acc = await tx.account.update({
        where: { id: account.id },
        data: { cashBalance: money(account.cashBalance + amount) },
      });
      await tx.transaction.create({
        data: {
          accountId: account.id,
          type: "DEPOSIT",
          amount,
          note: `Mock deposit of $${amount.toFixed(2)}`,
        },
      });
      return acc;
    });
    res.json({ account: updated, deposited: amount });
  })
);

accountsRouter.post(
  "/:id/withdraw",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = fundSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const account = await prisma.account.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!account) return res.status(404).json({ error: "Account not found" });

    const amount = money(parsed.data.amount);
    if (amount > account.cashBalance) {
      return res.status(400).json({ error: "Insufficient cash to withdraw" });
    }
    const updated = await prisma.$transaction(async (tx) => {
      const acc = await tx.account.update({
        where: { id: account.id },
        data: { cashBalance: money(account.cashBalance - amount) },
      });
      await tx.transaction.create({
        data: {
          accountId: account.id,
          type: "WITHDRAWAL",
          amount: -amount,
          note: `Mock withdrawal of $${amount.toFixed(2)}`,
        },
      });
      return acc;
    });
    res.json({ account: updated, withdrawn: amount });
  })
);

// Transaction history for an account.
accountsRouter.get(
  "/:id/transactions",
  asyncHandler(async (req: AuthedRequest, res) => {
    const account = await prisma.account.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!account) return res.status(404).json({ error: "Account not found" });
    const transactions = await prisma.transaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ transactions });
  })
);

function defaultName(type: string): string {
  switch (type) {
    case "TFSA":
      return "TFSA";
    case "RRSP":
      return "RRSP";
    case "CRYPTO":
      return "Crypto";
    default:
      return "Personal";
  }
}
