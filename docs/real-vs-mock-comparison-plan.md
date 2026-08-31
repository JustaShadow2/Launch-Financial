# Plan: Real-vs-Mock Investment Comparison

> **Status: design only — not implemented.** This documents how we'd let a user
> compare their simulated Launch Financial portfolio against their real-money
> investments, so they can see whether their practice decisions are beating (or
> lagging) what they actually do with real money.

## 1. Goal & the core problem

Users practice in the simulator with real prices and fake money. The natural
question is: **"Am I actually any good — how do my mock decisions stack up
against my real portfolio?"**

The hard part: we have complete, trustworthy data for the *mock* side (every
deposit and trade is in our ledger), but the *real* side lives at the user's
actual brokerage, which we don't (and shouldn't) connect to. So the design
centers on **how the user supplies real-money performance** with the least
friction and the most privacy, and how we present an honest apples-to-apples
comparison.

## 2. How the user provides real-money data (three tiers)

We support increasing levels of fidelity. Start with Tier 1.

### Tier 1 — Manual summary (MVP)
The user enters a few numbers describing their real portfolio for a period:
- Starting value, ending value, net contributions during the period, OR
- Simply a self-reported return % for a period (e.g. "+8.2% this year").

Lowest friction, no sensitive holdings stored, works day one. Good enough to
answer "am I beating my real returns?"

### Tier 2 — Manual holdings (better metrics)
The user enters real positions (symbol, quantity, cost basis, optional purchase
date). We price them with the same market-data engine we already have, so we
can compute live value, P/L, diversification, and per-position comparison —
without any brokerage link. This reuses the existing quote/history services.

### Tier 3 — Brokerage aggregation (future, optional)
Integrate an aggregator (e.g. Plaid Investments, SnapTrade, or Yodlee) to pull
real holdings automatically. Highest fidelity, but adds cost, a vendor
dependency, OAuth complexity, and real regulatory/privacy weight. Explicitly a
later phase, gated behind clear consent.

## 3. Comparability: making it apples-to-apples

Raw "my mock made $500, my real made $2,000" is misleading if the pots are
different sizes or the time periods differ. The comparison must normalize:

- **Percentage return, not dollars**, as the headline metric.
- **Same time window** on both sides (the widget's range selector drives both).
- **Contribution-aware return** — use a money-weighted (IRR/XIRR) or
  time-weighted return so deposits/withdrawals don't masquerade as performance.
  The mock side already has the full cash-flow ledger (`getNetWorthHistory`
  reconstruction), which is exactly what an XIRR needs; the real side uses
  whatever tier of data the user gave.
- **A shared benchmark** (e.g. S&P 500 / a broad ETF like VOO) shown alongside
  both, so "beating yourself" is also framed against "beating the market."

## 4. Metrics to show

Headline (Tier 1+):
- **Return %** for the selected period — mock vs. real vs. benchmark.
- **Absolute P/L** (secondary, since pot sizes differ).
- **Delta**: "Your simulated portfolio is +3.1% vs. your real portfolio this
  period."

Richer (Tier 2+, when we have positions/history):
- **Annualized / time-weighted return** (normalizes different periods).
- **Money-weighted return (XIRR)** — rewards good timing of contributions.
- **Volatility / max drawdown** — is the mock outperformance just more risk?
- **Win rate** — % of closed mock trades that were profitable.
- **Diversification / concentration** — top-holding weight, sector mix
  (we already classify STOCK/ETF/CRYPTO).
- **Cash drag** — average uninvested cash %, a common real-world return killer.

Every metric is computable for the mock side today from the ledger + price
history; the real side shows only the metrics its data tier supports (graceful
degradation, clearly labeled).

## 5. Data model (Tier 1–2)

New Prisma models (illustrative — not created yet):

```
model RealPortfolioSnapshot {   // Tier 1
  id            String   @id @default(cuid())
  userId        String
  asOf          DateTime          // date this snapshot represents
  totalValue    Float
  netContrib    Float   @default(0)  // contributions since last snapshot
  reportedReturnPct Float?           // optional direct self-report
  createdAt     DateTime @default(now())
  @@index([userId])
}

model RealHolding {              // Tier 2
  id        String @id @default(cuid())
  userId    String
  symbol    String
  quantity  Float
  costBasis Float                 // total or per-share (define one)
  acquiredAt DateTime?
  @@index([userId])
}
```

All rows are strictly per-user and cascade-delete with the account (same
pattern as existing models). No third party sees this data in Tier 1–2.

## 6. API sketch

- `GET  /api/compare?range=1M|3M|1Y|ALL` → `{ mock, real, benchmark }`, each
  `{ returnPct, absolutePL, series?: NetWorthPoint[] }`. Reuses the existing
  net-worth reconstruction for `mock`.
- `PUT  /api/compare/real` → upsert Tier 1 snapshot or Tier 2 holdings.
- `GET  /api/compare/real` → fetch what the user has entered.
- Benchmark series comes from the existing `getHistory` on a proxy ETF.

## 7. UI placement

Two good options; recommend **B**.

- **A) Dashboard widget** under the net-worth chart: a compact "You vs. your
  real portfolio" card with the two return numbers, the benchmark, and a small
  dual-line sparkline. Pros: high visibility. Cons: crowds the home page; the
  real side is empty until the user sets it up.
- **B) Dedicated "Compare" tab** (recommended): full room for the dual chart,
  the metrics table, the range selector, and the real-data entry form/empty
  state. A small teaser card on the dashboard ("See how you compare →") links
  to it. Cleaner, and keeps the real-data entry flow out of the main view.

Empty state: if no real data yet, show a friendly setup card explaining the
tiers and privacy, with a "Add my real numbers" CTA.

Dual chart: reuse the `NetWorthChart` pattern with two series (mock vs.
benchmark, and real when available), a legend, and the shared range toggle.

## 8. Privacy, trust, and framing (important)

- **Real financial data is sensitive.** Store only what's needed; make it
  clearly deletable (extend the existing "delete account" cascade, plus a
  "clear my real data" button). Never expose it to the Coach/LLM unless the
  user explicitly opts in per request.
- **Not advice.** Keep the same educational framing as the Coach — this is a
  reflection/learning tool, not a recommendation engine.
- **Honesty about limits.** Self-reported real returns can be inaccurate or
  cherry-picked; label the real side as "self-reported" and show the benchmark
  so the comparison stays grounded. Timeframes and contribution handling must
  match or the delta is meaningless — enforce that in the math, not just copy.
- If Tier 3 (aggregation) is ever built, it needs explicit consent, a reputable
  vendor, encryption at rest, and a clear data-retention/disconnect story.

## 9. Phasing & rough effort

- **Phase 1 (MVP, ~1–2 days):** Tier 1 manual summary + `Compare` tab + return%
  vs benchmark for the selected range, reusing existing net-worth + history
  services. One small model, one route, one page.
- **Phase 2 (~2–3 days):** Tier 2 real holdings priced live; add annualized/
  XIRR, win rate, diversification, cash drag; dual chart.
- **Phase 3 (larger):** Brokerage aggregation (Plaid/SnapTrade), consent flow,
  scheduled refresh. Only if there's real demand — meaningful cost/complexity.

## 10. Open questions to resolve before building

1. Cost basis on `RealHolding`: total vs per-share — pick one and validate.
2. Which benchmark(s) to offer (single S&P 500 proxy vs. user-selectable)?
3. Money-weighted (XIRR) vs time-weighted as the default headline — XIRR is
   fairer to contribution timing but harder to explain; maybe show both.
4. Do we let the Coach reference real data? Default **no**, opt-in only.
