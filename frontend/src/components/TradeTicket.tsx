import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAccounts } from "../hooks/useAccounts";
import { formatMoney, formatPrice, formatQty } from "../lib/format";

interface Props {
  symbol: string;
  price: number;
}

export function TradeTicket({ symbol, price }: Props) {
  const { accounts, loading, reload } = useAccounts();
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [accountId, setAccountId] = useState<string>("");
  const [qty, setQty] = useState("1");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeAccountId = accountId || accounts[0]?.accountId || "";
  const account = accounts.find((a) => a.accountId === activeAccountId);
  const held = account?.positions.find((p) => p.symbol === symbol)?.quantity ?? 0;

  const quantity = parseFloat(qty) || 0;
  const estimate = useMemo(() => Math.round(quantity * price * 100) / 100, [quantity, price]);

  async function submit() {
    setError("");
    setSuccess("");
    if (!(quantity > 0)) {
      setError("Enter a quantity greater than 0");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/trade/${side.toLowerCase()}`, {
        accountId: activeAccountId,
        symbol,
        quantity,
      });
      setSuccess(
        `${side === "BUY" ? "Bought" : "Sold"} ${formatQty(quantity)} ${symbol} @ ${formatPrice(price)}`
      );
      setQty("1");
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Trade failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="card">Loading accounts…</div>;

  // No accounts yet — guide the user to open one instead of a broken form.
  if (accounts.length === 0) {
    return (
      <div className="card" style={{ height: "fit-content", textAlign: "center" }}>
        <div style={{ fontSize: 32 }}>💼</div>
        <h3 style={{ margin: "8px 0 4px" }}>Open an account to trade</h3>
        <p className="muted" style={{ fontSize: 14 }}>
          You need an investment account before you can buy {symbol}.
        </p>
        <Link to="/funding" className="btn btn-block mt-8">
          Open an account
        </Link>
      </div>
    );
  }

  return (
    <div className="card" style={{ height: "fit-content" }}>
      <div className="seg" style={{ marginBottom: 16, width: "100%" }}>
        <button
          className={side === "BUY" ? "active" : ""}
          style={{ flex: 1 }}
          onClick={() => setSide("BUY")}
        >
          Buy
        </button>
        <button
          className={side === "SELL" ? "active" : ""}
          style={{ flex: 1 }}
          onClick={() => setSide("SELL")}
        >
          Sell
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <div className="field">
        <label>Account</label>
        <select value={activeAccountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.accountId} value={a.accountId}>
              {a.name} — {formatMoney(a.cashBalance)} cash
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Quantity {symbol.length <= 4 ? "(fractional allowed)" : ""}</label>
        <input
          type="number"
          min="0"
          step="any"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
      </div>

      <div className="row spread muted" style={{ fontSize: 14 }}>
        <span>Market price</span>
        <span>{formatPrice(price)}</span>
      </div>
      <div className="row spread" style={{ fontSize: 15, marginTop: 6, fontWeight: 600 }}>
        <span>Estimated {side === "BUY" ? "cost" : "proceeds"}</span>
        <span>{formatMoney(estimate)}</span>
      </div>

      {side === "SELL" && (
        <div className="row spread muted mt-8" style={{ fontSize: 13 }}>
          <span>You own</span>
          <span>
            {formatQty(held)} {symbol}
          </span>
        </div>
      )}
      {side === "BUY" && account && (
        <div className="row spread muted mt-8" style={{ fontSize: 13 }}>
          <span>Available cash</span>
          <span>{formatMoney(account.cashBalance)}</span>
        </div>
      )}

      <button
        className={`btn btn-block mt-16 ${side === "SELL" ? "btn-danger" : ""}`}
        onClick={submit}
        disabled={submitting}
      >
        {submitting ? "Placing order…" : `${side === "BUY" ? "Buy" : "Sell"} ${symbol}`}
      </button>
      <div className="muted mt-8" style={{ fontSize: 12, textAlign: "center" }}>
        Simulated market order. No real money.
      </div>
    </div>
  );
}
