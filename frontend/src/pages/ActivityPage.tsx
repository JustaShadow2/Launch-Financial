import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAccounts } from "../hooks/useAccounts";
import { Transaction } from "../api/types";
import { formatMoney, formatPrice, formatQty, gainClass } from "../lib/format";

export default function ActivityPage() {
  const { accounts, loading: accLoading } = useAccounts();
  const [accountId, setAccountId] = useState<string>("");
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const activeId = accountId || accounts[0]?.accountId || "";

  useEffect(() => {
    if (!activeId) return;
    setLoading(true);
    api
      .get<{ transactions: Transaction[] }>(`/accounts/${activeId}/transactions`)
      .then((r) => setTxns(r.transactions))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeId]);

  function label(t: Transaction) {
    switch (t.type) {
      case "DEPOSIT":
        return "Deposit";
      case "WITHDRAWAL":
        return "Withdrawal";
      case "BUY":
        return `Buy ${t.symbol}`;
      case "SELL":
        return `Sell ${t.symbol}`;
    }
  }

  if (accLoading) return <div className="loading">Loading…</div>;

  if (accounts.length === 0) {
    return (
      <div>
        <h1 className="page-title">Activity</h1>
        <p className="page-sub">Deposits, withdrawals, and trades.</p>
        <div className="card empty-state">
          <div style={{ fontSize: 40 }}>📄</div>
          <h3 style={{ margin: "8px 0 4px" }}>No activity yet</h3>
          <p className="muted" style={{ maxWidth: 420, margin: "0 auto 12px" }}>
            Open an account and add money to start seeing your deposits and trades here.
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
      <h1 className="page-title">Activity</h1>
      <p className="page-sub">Deposits, withdrawals, and trades.</p>

      <div className="seg" style={{ marginBottom: 20 }}>
        {accounts.map((a) => (
          <button
            key={a.accountId}
            className={a.accountId === activeId ? "active" : ""}
            onClick={() => setAccountId(a.accountId)}
          >
            {a.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Loading transactions…</div>
      ) : txns.length === 0 ? (
        <div className="card empty">No activity yet.</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Details</th>
                <th>Date</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span className={t.type === "BUY" ? "tag-buy" : t.type === "SELL" ? "tag-sell" : ""}>
                      {label(t)}
                    </span>
                  </td>
                  <td className="muted" style={{ fontSize: 14 }}>
                    {t.symbol && t.quantity != null && t.price != null
                      ? `${formatQty(t.quantity)} @ ${formatPrice(t.price)}`
                      : t.note}
                  </td>
                  <td className="muted" style={{ fontSize: 14 }}>
                    {new Date(t.createdAt).toLocaleString()}
                  </td>
                  <td className={gainClass(t.amount)} style={{ textAlign: "right", fontWeight: 600 }}>
                    {formatMoney(t.amount, { sign: true })}
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
