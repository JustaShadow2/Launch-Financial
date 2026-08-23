import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Quote } from "../api/types";
import { formatPercent, formatPrice, gainClass } from "../lib/format";

const FILTERS = ["ALL", "STOCK", "ETF", "CRYPTO"] as const;

export default function MarketPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    function load() {
      api
        .get<{ quotes: Quote[] }>("/market/quotes")
        .then((r) => {
          if (active) setQuotes(r.quotes);
        })
        .catch(() => {})
        .finally(() => active && setLoading(false));
    }
    load();
    const id = setInterval(load, 5000); // live-ish refresh
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quotes
      .filter((quote) => (filter === "ALL" ? true : quote.type === filter))
      .filter(
        (quote) =>
          !q ||
          quote.symbol.toLowerCase().includes(q) ||
          quote.name.toLowerCase().includes(q)
      );
  }, [quotes, query, filter]);

  return (
    <div>
      <h1 className="page-title">Market</h1>
      <p className="page-sub">Simulated quotes update every few seconds.</p>

      <div className="row spread" style={{ marginBottom: 16 }}>
        <input
          placeholder="Search stocks, ETFs, crypto…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <div className="seg">
          {FILTERS.map((f) => (
            <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading market…</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Type</th>
                <th>Price</th>
                <th>Today</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <tr key={q.symbol} className="clickable" onClick={() => navigate(`/asset/${q.symbol}`)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{q.symbol}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {q.name}
                    </div>
                  </td>
                  <td>
                    <span className={`pill ${q.type.toLowerCase()}`}>{q.type}</span>
                  </td>
                  <td>{formatPrice(q.price)}</td>
                  <td className={gainClass(q.change)}>
                    {formatPrice(q.change)} ({formatPercent(q.changePercent)})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
