import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAccounts } from "../hooks/useAccounts";
import { formatMoney, formatPercent, formatPrice, formatQty, gainClass } from "../lib/format";

export default function PortfolioPage() {
  const { accounts, loading } = useAccounts();
  const [activeId, setActiveId] = useState<string | null>(null);
  const navigate = useNavigate();

  if (loading) return <div className="loading">Loading…</div>;

  const active = accounts.find((a) => a.accountId === activeId) || accounts[0];

  if (!active) {
    return (
      <div>
        <h1 className="page-title">Portfolio</h1>
        <div className="card empty-state">
          <div style={{ fontSize: 40 }}>📈</div>
          <h3 style={{ margin: "8px 0 4px" }}>No accounts yet</h3>
          <p className="muted" style={{ maxWidth: 420, margin: "0 auto 12px" }}>
            Open an account and add money to start building your portfolio.
          </p>
          <Link to="/funding" className="btn">
            Open an account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Portfolio</h1>
      <div className="seg" style={{ marginBottom: 20 }}>
        {accounts.map((a) => (
          <button
            key={a.accountId}
            className={a.accountId === active.accountId ? "active" : ""}
            onClick={() => setActiveId(a.accountId)}
          >
            {a.name}
          </button>
        ))}
      </div>

      <div className="grid grid-3">
        <div className="card">
          <div className="stat-label">Total value</div>
          <div className="stat-value">{formatMoney(active.totalValue)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Cash</div>
          <div className="stat-value">{formatMoney(active.cashBalance)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Unrealized P/L</div>
          <div className={`stat-value ${gainClass(active.totalUnrealizedPL)}`}>
            {formatMoney(active.totalUnrealizedPL, { sign: true })}
          </div>
          <div className={gainClass(active.totalUnrealizedPL)}>
            {formatPercent(active.totalUnrealizedPLPercent)}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 20, marginTop: 28 }}>Holdings</h2>
      {active.positions.length === 0 ? (
        <div className="card empty">
          No positions in this account yet. Head to the Market to make your first trade.
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Qty</th>
                <th>Avg cost</th>
                <th>Price</th>
                <th>Market value</th>
                <th>P/L</th>
              </tr>
            </thead>
            <tbody>
              {active.positions.map((p) => (
                <tr
                  key={p.symbol}
                  className="clickable"
                  onClick={() => navigate(`/asset/${p.symbol}`)}
                >
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.symbol}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {p.name}
                    </div>
                  </td>
                  <td>{formatQty(p.quantity)}</td>
                  <td>{formatPrice(p.avgCost)}</td>
                  <td>{formatPrice(p.currentPrice)}</td>
                  <td style={{ fontWeight: 600 }}>{formatMoney(p.marketValue)}</td>
                  <td className={gainClass(p.unrealizedPL)}>
                    {formatMoney(p.unrealizedPL, { sign: true })}
                    <div style={{ fontSize: 13 }}>{formatPercent(p.unrealizedPLPercent)}</div>
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
