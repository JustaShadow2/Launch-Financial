import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { Candle, Quote } from "../api/types";
import { PriceChart } from "../components/PriceChart";
import { TradeTicket } from "../components/TradeTicket";
import { formatPercent, formatPrice, gainClass } from "../lib/format";

const RANGES = ["1W", "1M", "3M", "6M", "1Y"] as const;

export default function AssetPage() {
  const { symbol = "" } = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [range, setRange] = useState<(typeof RANGES)[number]>("1M");
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    let active = true;
    function loadQuote() {
      api
        .get<{ quote: Quote }>(`/market/quote/${symbol}`)
        .then((r) => active && setQuote(r.quote))
        .catch(() => {});
    }
    loadQuote();
    const id = setInterval(loadQuote, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [symbol]);

  useEffect(() => {
    api
      .get<{ candles: Candle[] }>(`/market/history/${symbol}?range=${range}`)
      .then((r) => setCandles(r.candles))
      .catch(() => {});
  }, [symbol, range]);

  useEffect(() => {
    api
      .get<{ items: Quote[] }>("/watchlist")
      .then((r) => setInWatchlist(r.items.some((i) => i.symbol === symbol)))
      .catch(() => {});
  }, [symbol]);

  async function toggleWatch() {
    if (inWatchlist) {
      await api.del(`/watchlist/${symbol}`);
      setInWatchlist(false);
    } else {
      await api.post("/watchlist", { symbol });
      setInWatchlist(true);
    }
  }

  if (!quote) return <div className="loading">Loading {symbol}…</div>;

  const positive = quote.change >= 0;

  return (
    <div>
      <div className="row spread">
        <div>
          <div className="row" style={{ gap: 10 }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              {quote.symbol}
            </h1>
            <span className={`pill ${quote.type.toLowerCase()}`}>{quote.type}</span>
          </div>
          <p className="page-sub" style={{ margin: "4px 0 0" }}>
            {quote.name}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={toggleWatch}>
          {inWatchlist ? "★ In watchlist" : "☆ Add to watchlist"}
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr", marginTop: 20 }}>
        <div className="card">
          <div className="row" style={{ gap: 10, alignItems: "baseline" }}>
            <div className="stat-value">{formatPrice(quote.price)}</div>
            <span className="pill" title={quote.source === "real" ? "Real-time market data" : "Simulated price"}>
              {quote.source === "real" ? "● Live" : "◦ Simulated"}
            </span>
          </div>
          <div className={gainClass(quote.change)} style={{ fontWeight: 600, marginTop: 4 }}>
            {formatPrice(quote.change)} ({formatPercent(quote.changePercent)}) today
          </div>
          {candles.length > 1 && (
            <div style={{ marginTop: 16 }}>
              <PriceChart candles={candles} positive={positive} height={260} />
            </div>
          )}
          <div className="seg seg-range mt-16">
            {RANGES.map((r) => (
              <button key={r} className={range === r ? "active" : ""} onClick={() => setRange(r)}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <TradeTicket symbol={quote.symbol} price={quote.price} />
      </div>
    </div>
  );
}
