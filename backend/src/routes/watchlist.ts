import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, requireAuth, AuthedRequest } from "../middleware/authMiddleware";
import { getQuotes } from "../services/marketData";
import { isValidSymbol } from "../data/symbols";

export const watchlistRouter = Router();

watchlistRouter.use(requireAuth);

watchlistRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const items = await prisma.watchlistItem.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    const quotes = getQuotes(items.map((i) => i.symbol));
    res.json({ items: quotes });
  })
);

const addSchema = z.object({ symbol: z.string().min(1) });

watchlistRouter.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = addSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const symbol = parsed.data.symbol.toUpperCase();
    if (!isValidSymbol(symbol)) return res.status(400).json({ error: "Unknown symbol" });
    await prisma.watchlistItem.upsert({
      where: { userId_symbol: { userId: req.userId!, symbol } },
      create: { userId: req.userId!, symbol },
      update: {},
    });
    res.status(201).json({ ok: true });
  })
);

watchlistRouter.delete(
  "/:symbol",
  asyncHandler(async (req: AuthedRequest, res) => {
    const symbol = req.params.symbol.toUpperCase();
    await prisma.watchlistItem.deleteMany({ where: { userId: req.userId, symbol } });
    res.json({ ok: true });
  })
);
