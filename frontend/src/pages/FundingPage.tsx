import { useState } from "react";
import { api, ApiError } from "../api/client";
import { useAccounts } from "../hooks/useAccounts";
import { formatMoney } from "../lib/format";

const PRESETS = [100, 500, 1000, 5000];
const NEW_ACCOUNT_TYPES = ["TFSA", "RRSP", "CRYPTO"] as const;

export default function FundingPage() {
  const { accounts, loading, reload } = useAccounts();
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("1000");
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const activeId = accountId || accounts[0]?.accountId || "";
  const account = accounts.find((a) => a.accountId === activeId);

  async function submit() {
    setError("");
    setSuccess("");
    const value = parseFloat(amount);
    if (!(value > 0)) {
      setError("Enter an amount greater than 0");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/accounts/${activeId}/${mode}`, { amount: value });
      setSuccess(
        `${mode === "deposit" ? "Added" : "Withdrew"} ${formatMoney(value)} ${
          mode === "deposit" ? "to" : "from"
        } ${account?.name}`
      );
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Transaction failed");
    } finally {
      setBusy(false);
    }
  }

  async function createAccount(type: string) {
    setError("");
    setSuccess("");
    try {
      await api.post("/accounts", { type });
      setSuccess(`Opened a new ${type} account`);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open account");
    }
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div>
      <h1 className="page-title">Move money</h1>
      <p className="page-sub">Add or withdraw mock funds. Everything here is simulated.</p>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card">
          <div className="seg" style={{ marginBottom: 16, width: "100%" }}>
            <button
              className={mode === "deposit" ? "active" : ""}
              style={{ flex: 1 }}
              onClick={() => setMode("deposit")}
            >
              Add money
            </button>
            <button
              className={mode === "withdraw" ? "active" : ""}
              style={{ flex: 1 }}
              onClick={() => setMode("withdraw")}
            >
              Withdraw
            </button>
          </div>

          {error && <div className="error-banner">{error}</div>}
          {success && <div className="success-banner">{success}</div>}

          <div className="field">
            <label>Account</label>
            <select value={activeId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.accountId} value={a.accountId}>
                  {a.name} — {formatMoney(a.cashBalance)} cash
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Amount</label>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {mode === "deposit" && (
            <div className="row" style={{ flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {PRESETS.map((p) => (
                <button
                  key={p}
                  className="btn btn-secondary btn-sm"
                  onClick={() => setAmount(String(p))}
                >
                  +{formatMoney(p)}
                </button>
              ))}
            </div>
          )}

          <button className="btn btn-block mt-8" onClick={submit} disabled={busy}>
            {busy ? "Processing…" : mode === "deposit" ? "Add mock money" : "Withdraw"}
          </button>
        </div>

        <div className="card" style={{ height: "fit-content" }}>
          <h3 style={{ marginTop: 0 }}>Open a new account</h3>
          <p className="muted" style={{ fontSize: 14 }}>
            Like Wealthsimple, you can hold multiple account types.
          </p>
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            {NEW_ACCOUNT_TYPES.map((t) => {
              const exists = accounts.some((a) => a.type === t);
              return (
                <button
                  key={t}
                  className="btn btn-secondary btn-sm"
                  disabled={exists}
                  onClick={() => createAccount(t)}
                >
                  {exists ? `${t} ✓` : `Open ${t}`}
                </button>
              );
            })}
          </div>

          <div className="mt-24">
            <div className="stat-label">Total cash across accounts</div>
            <div className="stat-value">
              {formatMoney(accounts.reduce((s, a) => s + a.cashBalance, 0))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
