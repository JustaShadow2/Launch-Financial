import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Quote, SymbolInfo } from "../api/types";
import { formatPercent, formatPrice, gainClass } from "../lib/format";

interface PopularGroup {
  category: string; // STOCK | ETF | CRYPTO
  quotes: Quote[];
}

const CATEGORY_LABELS: Record<string, string> = {
  STOCK: "Popular stocks",
  ETF: "Popular ETFs",
  CRYPTO: "Popular crypto",
};

function QuoteTable({
  quotes,
  onOpen,
  isWatched,
  onToggleWatch,
}: {
  quotes: Quote[];
  onOpen: (symbol: string) => void;
  isWatched: (symbol: string) => boolean;
  onToggleWatch: (symbol: string) => void;
}) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <table>
        <thead>
          <tr>
            <th style={{ width: 44 }}></th>
            <th>Symbol</th>
            <th>Price</th>
            <th>Today</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => {
            const watched = isWatched(q.symbol);
            return (
              <tr key={q.symbol} className="clickable" onClick={() => onOpen(q.symbol)}>
                <td style={{ paddingRight: 0 }}>
                  <button
                    className={`star-btn ${watched ? "on" : ""}`}
                    aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
                    title={watched ? "Remove from watchlist" : "Add to watchlist"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWatch(q.symbol);
                    }}
                  >
                    {watched ? "★" : "☆"}
                  </button>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{q.symbol}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {q.name}
                  </div>
                </td>
                <td>{formatPrice(q.price)}</td>
                <td className={gainClass(q.change)}>
                  {formatPrice(q.change)} ({formatPercent(q.changePercent)})
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MarketPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [watchQuotes, setWatchQuotes] = useState<Quote[]>([]);
  const [popular, setPopular] = useState<PopularGroup[]>([]);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Default view: watchlist + popular sections, refreshed periodically.
  useEffect(() => {
    let active = true;
    function load() {
      Promise.all([
        api.get<{ quotes: Quote[] }>("/market/quotes"),
        api.get<{ groups: PopularGroup[] }>("/market/popular"),
      ])
        .then(([w, p]) => {
          if (!active) return;
          setWatchQuotes(w.quotes);
          setPopular(p.groups);
          setWatched(new Set(w.quotes.map((q) => q.symbol)));
        })
        .catch(() => {})
        .finally(() => active && setLoading(false));
    }
    load();
    const id = setInterval(load, 10000);
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

  const open = (symbol: string) => navigate(`/asset/${symbol}`);
  const showingSearch = query.trim().length > 0;

  // Optimistic watchlist toggle from the quick-star on a row.
  async function toggleWatch(symbol: string) {
    const wasWatched = watched.has(symbol);
    setWatched((prev) => {
      const next = new Set(prev);
      if (wasWatched) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
    try {
      if (wasWatched) await api.del(`/watchlist/${symbol}`);
      else await api.post("/watchlist", { symbol });
    } catch {
      // Roll back on failure.
      setWatched((prev) => {
        const next = new Set(prev);
        if (wasWatched) next.add(symbol);
        else next.delete(symbol);
        return next;
      });
    }
  }
  const isWatched = (symbol: string) => watched.has(symbol);

  return (
    <div>
      <h1 className="page-title">Market</h1>
      <p className="page-sub">Search any stock, ETF, or crypto by name or ticker.</p>

      <div className="row" style={{ marginBottom: 20 }}>
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
                  <tr key={r.symbol} className="clickable" onClick={() => open(r.symbol)}>
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
      ) : loading ? (
        <div className="loading">Loading market…</div>
      ) : (
        <div className="market-sections">
          {/* Watchlist first, if the user has one */}
          {watchQuotes.length > 0 && (
            <section>
              <h2 className="section-title">Your watchlist</h2>
              <QuoteTable
                quotes={watchQuotes}
                onOpen={open}
                isWatched={isWatched}
                onToggleWatch={toggleWatch}
              />
            </section>
          )}

          {/* Popular sections per category */}
          {popular.map(
            (g) =>
              g.quotes.length > 0 && (
                <section key={g.category}>
                  <h2 className="section-title">{CATEGORY_LABELS[g.category] || g.category}</h2>
                  <QuoteTable
                    quotes={g.quotes}
                    onOpen={open}
                    isWatched={isWatched}
                    onToggleWatch={toggleWatch}
                  />
                </section>
              )
          )}

          {watchQuotes.length === 0 && popular.every((g) => g.quotes.length === 0) && (
            <div className="card empty">
              Search above to find symbols, then add them to your watchlist to track them here.
            </div>
          )}

          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            "Popular" is a curated selection of widely held names, not a live most-active ranking.
          </p>
        </div>
      )}
    </div>
  );
}
