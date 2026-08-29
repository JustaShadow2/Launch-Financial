import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAccounts } from "../hooks/useAccounts";
import { Candle } from "../api/types";
import { useNavigate } from "react-router-dom";
import { PriceChart } from "../components/PriceChart";
import { formatMoney, formatPercent, gainClass } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { DailyLesson, LearnStats } from "../api/types";

interface NetWorth {
  cash: number;
  investments: number;
  total: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { accounts, loading } = useAccounts();
  const [net, setNet] = useState<NetWorth | null>(null);
  const [learnStats, setLearnStats] = useState<LearnStats | null>(null);
  const [daily, setDaily] = useState<DailyLesson | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<NetWorth>("/accounts/net-worth").then(setNet).catch(() => {});
  }, [accounts]);

  useEffect(() => {
    api.get<LearnStats>("/learn/stats").then(setLearnStats).catch(() => {});
    api.get<{ lesson: DailyLesson | null }>("/learn/daily").then((r) => setDaily(r.lesson)).catch(() => {});
  }, []);

  const totalPL = accounts.reduce((s, a) => s + a.totalUnrealizedPL, 0);
  const totalCost = accounts.reduce((s, a) => s + a.totalCostBasis, 0);
  const plPct = totalCost ? (totalPL / totalCost) * 100 : 0;

  // A simple synthetic net-worth trend from the largest account's top holding, for visual flavor.
  const [trend, setTrend] = useState<Candle[]>([]);
  useEffect(() => {
    const top = accounts.flatMap((a) => a.positions).sort((a, b) => b.marketValue - a.marketValue)[0];
    if (top) {
      api
        .get<{ candles: Candle[] }>(`/market/history/${top.symbol}?range=3M`)
        .then((r) => setTrend(r.candles))
        .catch(() => {});
    }
  }, [accounts]);

  if (loading) return <div className="loading">Loading your portfolio…</div>;

  return (
    <div>
      <p className="page-sub" style={{ marginBottom: 4 }}>
        Good to see you, {user?.firstName}
      </p>
      <h1 className="page-title">Home</h1>

      <div className="card">
        <div className="stat-label">Net worth</div>
        <div className="stat-value big">{formatMoney(net?.total ?? 0)}</div>
        <div className={gainClass(totalPL)} style={{ marginTop: 6, fontWeight: 600 }}>
          {formatMoney(totalPL, { sign: true })} ({formatPercent(plPct)}) all time
        </div>
        {trend.length > 1 && (
          <div style={{ marginTop: 16 }}>
            <PriceChart candles={trend} positive={totalPL >= 0} height={200} />
          </div>
        )}
      </div>

      <div className="grid grid-3 mt-16">
        <div className="card">
          <div className="stat-label">Total invested</div>
          <div className="stat-value">{formatMoney(net?.investments ?? 0)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Available cash</div>
          <div className="stat-value">{formatMoney(net?.cash ?? 0)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Accounts</div>
          <div className="stat-value">{accounts.length}</div>
        </div>
      </div>

      {daily && (
        <div className="card daily-card mt-16" style={{ cursor: "pointer" }} onClick={() => navigate(`/learn/lesson/${daily.lessonId}`)}>
          <div>
            <div className="row" style={{ gap: 8, marginBottom: 4 }}>
              <span className="pill">🔥 {learnStats?.currentStreak ?? 0} day streak</span>
              <span className="pill">⚡ {learnStats?.xp ?? 0} XP</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {learnStats?.dailyGoalMet ? "Keep learning: " : "Today's lesson: "}
              {daily.courseIcon} {daily.title}
            </div>
            <div className="muted">
              {daily.courseTitle} · {daily.minutes} min · +{daily.xp} XP
            </div>
          </div>
          <button className="btn" onClick={(e) => { e.stopPropagation(); navigate(`/learn/lesson/${daily.lessonId}`); }}>
            {learnStats?.dailyGoalMet ? "Continue" : "Start"}
          </button>
        </div>
      )}

      <div className="row spread mt-24" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Your accounts</h2>
        {accounts.length > 0 && (
          <Link to="/funding" className="btn btn-sm">
            Add money
          </Link>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="card empty-state">
          <div style={{ fontSize: 40 }}>🚀</div>
          <h3 style={{ margin: "8px 0 4px" }}>Get started</h3>
          <p className="muted" style={{ maxWidth: 440, margin: "0 auto 12px" }}>
            You don't have any accounts yet. Open your first account, add some mock money, and start
            investing.
          </p>
          <Link to="/funding" className="btn">
            Open an account
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Cash</th>
                <th>Investments</th>
                <th>Total</th>
                <th>All-time P/L</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.accountId}>
                  <td>
                    <Link to="/portfolio" style={{ fontWeight: 600 }}>
                      {a.name}
                    </Link>{" "}
                    <span className="pill">{a.type}</span>
                  </td>
                  <td>{formatMoney(a.cashBalance)}</td>
                  <td>{formatMoney(a.investmentsValue)}</td>
                  <td style={{ fontWeight: 600 }}>{formatMoney(a.totalValue)}</td>
                  <td className={gainClass(a.totalUnrealizedPL)}>
                    {formatMoney(a.totalUnrealizedPL, { sign: true })} (
                    {formatPercent(a.totalUnrealizedPLPercent)})
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
