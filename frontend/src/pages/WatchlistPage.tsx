import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Quote } from "../api/types";
import { formatPercent, formatPrice, gainClass } from "../lib/format";

export default function WatchlistPage() {
  const [items, setItems] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  function load() {
    api
      .get<{ items: Quote[] }>("/watchlist")
      .then((r) => setItems(r.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  async function remove(symbol: string, e: React.MouseEvent) {
    e.stopPropagation();
    await api.del(`/watchlist/${symbol}`);
    load();
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div>
      <h1 className="page-title">Watchlist</h1>
      <p className="page-sub">Track symbols you're interested in.</p>

      {items.length === 0 ? (
        <div className="card empty">
          Your watchlist is empty. Add symbols from any asset page.
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Price</th>
                <th>Today</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr key={q.symbol} className="clickable" onClick={() => navigate(`/asset/${q.symbol}`)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{q.symbol}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {q.name}
                    </div>
                  </td>
                  <td>{formatPrice(q.price)}</td>
                  <td className={gainClass(q.change)}>{formatPercent(q.changePercent)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => remove(q.symbol, e)}>
                      Remove
                    </button>
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
