import { useState } from "react";
import { api, ApiError } from "../api/client";
import { useAccounts } from "../hooks/useAccounts";
import { formatMoney } from "../lib/format";

const PRESETS = [100, 500, 1000, 5000];

// Account types a user can open, with short descriptions.
const ACCOUNT_TYPES: { type: string; label: string; blurb: string; icon: string }[] = [
  { type: "PERSONAL", label: "Personal", blurb: "A flexible non-registered account.", icon: "👤" },
  { type: "TFSA", label: "TFSA", blurb: "Tax-free growth, within limits.", icon: "🍁" },
  { type: "RRSP", label: "RRSP", blurb: "Retirement savings, tax-deferred.", icon: "🏦" },
  { type: "CRYPTO", label: "Crypto", blurb: "Hold crypto positions.", icon: "🪙" },
];

export default function FundingPage() {
  const { accounts, loading, reload } = useAccounts();
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("1000");
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [openingType, setOpeningType] = useState("");

  const hasAccounts = accounts.length > 0;
  const activeId = accountId || accounts[0]?.accountId || "";
  const account = accounts.find((a) => a.accountId === activeId);
  const totalCash = accounts.reduce((s, a) => s + a.cashBalance, 0);

  async function submit() {
    setError("");
    setSuccess("");
    if (!activeId) {
      setError("Open an account first.");
      return;
    }
    const value = parseFloat(amount);
    if (!(value > 0)) {
      setError("Enter an amount greater than 0");
      return;
    }
    if (mode === "withdraw" && account && value > account.cashBalance) {
      setError("You can't withdraw more than the account's cash balance.");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/accounts/${activeId}/${mode}`, { amount: value });
      setSuccess(
        `${mode === "deposit" ? "Added" : "Withdrew"} ${formatMoney(value)} ${
          mode === "deposit" ? "to" : "from"
        } ${account?.name}.`
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
    setOpeningType(type);
    try {
      const res = await api.post<{ account: { id: string } }>("/accounts", { type });
      setSuccess(`Opened a new ${type} account.`);
      await reload();
      // Select the newly opened account for funding.
      if (res?.account?.id) setAccountId(res.account.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open account");
    } finally {
      setOpeningType("");
    }
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div>
      <h1 className="page-title">Move money</h1>
      <p className="page-sub">Add or withdraw mock funds. Everything here is simulated.</p>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      {/* Total cash banner */}
      {hasAccounts && (
        <div className="card fund-summary">
          <div>
            <div className="stat-label">Total cash across accounts</div>
            <div className="stat-value big">{formatMoney(totalCash)}</div>
          </div>
          <div className="fund-summary-accounts">
            {accounts.map((a) => (
              <div key={a.accountId} className="fund-chip">
                <span className="pill">{a.type}</span>
                <span style={{ fontWeight: 600 }}>{formatMoney(a.cashBalance)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* First-account empty state */}
      {!hasAccounts && (
        <div className="card empty-state">
          <div style={{ fontSize: 40 }}>🚀</div>
          <h2 style={{ margin: "8px 0 4px" }}>Open your first account</h2>
          <p className="muted" style={{ maxWidth: 460, margin: "0 auto 4px" }}>
            You don't have any accounts yet. Open one below to start adding mock money and investing.
          </p>
        </div>
      )}

      <div className="grid fund-grid">
        {/* Deposit / withdraw */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{hasAccounts ? "Add or withdraw" : "Add money"}</h3>
          {!hasAccounts ? (
            <p className="muted" style={{ fontSize: 14 }}>
              Open an account first — then you can fund it here.
            </p>
          ) : (
            <>
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

              <div className="field">
                <label>Account</label>
                <select value={activeId} onChange={(e) => setAccountId(e.target.value)}>
                  {accounts.map((a) => (
                    <option key={a.accountId} value={a.accountId}>
                      {a.name} — {formatMoney(a.cashBalance)} available
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
                  placeholder="0.00"
                />
              </div>

              {mode === "deposit" && (
                <div className="row" style={{ flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
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

              {mode === "withdraw" && account && (
                <div className="row spread muted" style={{ fontSize: 13, marginBottom: 4 }}>
                  <span>Available to withdraw</span>
                  <span>{formatMoney(account.cashBalance)}</span>
                </div>
              )}

              <button className="btn btn-block mt-8" onClick={submit} disabled={busy}>
                {busy ? "Processing…" : mode === "deposit" ? "Add mock money" : "Withdraw"}
              </button>
            </>
          )}
        </div>

        {/* Accounts */}
        <div className="card" style={{ height: "fit-content" }}>
          <h3 style={{ marginTop: 0 }}>{hasAccounts ? "Your accounts" : "Choose an account type"}</h3>
          <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>
            You can hold multiple account types. Each has its own cash and positions.
          </p>
          <div className="account-type-list">
            {ACCOUNT_TYPES.map((t) => {
              const existing = accounts.find((a) => a.type === t.type);
              return (
                <div key={t.type} className="account-type-row">
                  <div className="account-type-info">
                    <span className="account-type-icon">{t.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t.label}</div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {existing ? `Balance ${formatMoney(existing.cashBalance)}` : t.blurb}
                      </div>
                    </div>
                  </div>
                  {existing ? (
                    <span className="pill" style={{ color: "var(--gain)" }}>Open ✓</span>
                  ) : (
                    <button
                      className="btn btn-sm"
                      disabled={openingType === t.type}
                      onClick={() => createAccount(t.type)}
                    >
                      {openingType === t.type ? "Opening…" : "Open"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
