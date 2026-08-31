import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { config } from "./lib/config";
import { authRouter } from "./routes/auth";
import { accountsRouter } from "./routes/accounts";
import { marketRouter } from "./routes/market";
import { tradeRouter } from "./routes/trade";
import { watchlistRouter } from "./routes/watchlist";
import { learnRouter } from "./routes/learn";
import { coachRouter } from "./routes/coach";
import { startQuoteCache } from "./services/quoteCache";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "launch-financial-api", time: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/market", marketRouter);
app.use("/api/trade", tradeRouter);
app.use("/api/watchlist", watchlistRouter);
app.use("/api/learn", learnRouter);
app.use("/api/coach", coachRouter);

// In production, serve the built frontend (single-service deploy). The Vite
// dev server handles this in development, so this is a no-op unless
// SERVE_STATIC_DIR points at a real frontend/dist build.
const staticDir = config.serveStaticDir;
if (staticDir && fs.existsSync(path.join(staticDir, "index.html"))) {
  app.use(express.static(staticDir));

  // SPA fallback: any non-API GET returns index.html so client routing works.
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(staticDir, "index.html"));
  });
  console.log(`[web] Serving frontend from ${staticDir}`);
}

// 404 (API routes and, in dev, everything)
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Central error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as Error & { status?: number };
  const status = e.status || 500;
  if (status >= 500) console.error(e);
  res.status(status).json({ error: e.message || "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
  // Begin refreshing real quotes in the background (no-op without an API key).
  startQuoteCache();
});
