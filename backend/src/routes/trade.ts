import { Router } from "express";
import { z } from "zod";
import { asyncHandler, requireAuth, AuthedRequest } from "../middleware/authMiddleware";
import { executeBuy, executeSell, TradeError } from "../services/trading";
import { prisma } from "../lib/prisma";

export const tradeRouter = Router();

tradeRouter.use(requireAuth);

const tradeSchema = z.object({
  accountId: z.string().min(1),
  symbol: z.string().min(1),
  quantity: z.number().positive(),
});

tradeRouter.post(
  "/buy",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = tradeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    try {
      const result = await executeBuy({ ...parsed.data, userId: req.userId! });
      res.json({ ok: true, ...result });
    } catch (e) {
      if (e instanceof TradeError) return res.status(e.status).json({ error: e.message });
      throw e;
    }
  })
);

tradeRouter.post(
  "/sell",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = tradeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    try {
      const result = await executeSell({ ...parsed.data, userId: req.userId! });
      res.json({ ok: true, ...result });
    } catch (e) {
      if (e instanceof TradeError) return res.status(e.status).json({ error: e.message });
      throw e;
    }
  })
);

// Order history across the user's accounts (or one account via ?accountId=).
tradeRouter.get(
  "/orders",
  asyncHandler(async (req: AuthedRequest, res) => {
    const accountId = req.query.accountId ? String(req.query.accountId) : undefined;
    const accounts = await prisma.account.findMany({
      where: { userId: req.userId, ...(accountId ? { id: accountId } : {}) },
      select: { id: true },
    });
    const ids = accounts.map((a) => a.id);
    const orders = await prisma.order.findMany({
      where: { accountId: { in: ids } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ orders });
  })
);
