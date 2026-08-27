import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Quote, SymbolInfo } from "../api/types";
import { formatPercent, formatPrice, gainClass } from "../lib/format";

export default function MarketPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [watchQuotes, setWatchQuotes] = useState<Quote[]>([]);
  const [loadingWatch, setLoadingWatch] = useState(true);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Default view: the user's watchlist quotes, refreshed periodically.
  useEffect(() => {
    let active = true;
    function load() {
      api
        .get<{ quotes: Quote[] }>("/market/quotes")
        .then((r) => active && setWatchQuotes(r.quotes))
        .catch(() => {})
        .finally(() => active && setLoadingWatch(false));
    }
    load();
    const id = setInterval(load, 8000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // Debounced live symbol search.
  useEffect(() => {
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      api
        .get<{ results: SymbolInfo[] }>(`/market/search?q=${encodeURIComponent(q)}`)
        .then((r) => setResults(r.results))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const showingSearch = query.trim().length > 0;

  return (
    <div>
      <h1 className="page-title">Market</h1>
      <p className="page-sub">Search any stock, ETF, or crypto by name or ticker.</p>

      <div className="row" style={{ marginBottom: 16 }}>
        <input
          placeholder="Search e.g. Apple, WMT, Bitcoin…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: 420 }}
          autoFocus
        />
      </div>

      {showingSearch ? (
        <div className="card" style={{ padding: 0 }}>
          {searching && results.length === 0 ? (
            <div className="loading">Searching…</div>
          ) : results.length === 0 ? (
            <div className="empty">No matches. Try a ticker like AAPL or a company name.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr
                    key={r.symbol}
                    className="clickable"
                    onClick={() => navigate(`/asset/${r.symbol}`)}
                  >
                    <td style={{ fontWeight: 600 }}>{r.symbol}</td>
                    <td className="muted">{r.name}</td>
                    <td>
                      <span className={`pill ${r.type.toLowerCase()}`}>{r.type}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: 18, margin: "8px 0 12px" }}>Your watchlist</h2>
          {loadingWatch ? (
            <div className="loading">Loading…</div>
          ) : watchQuotes.length === 0 ? (
            <div className="card empty">
              Search above to find symbols, then add them to your watchlist to track them here.
            </div>
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
                  {watchQuotes.map((q) => (
                    <tr
                      key={q.symbol}
                      className="clickable"
                      onClick={() => navigate(`/asset/${q.symbol}`)}
                    >
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
        </>
      )}
    </div>
  );
}
