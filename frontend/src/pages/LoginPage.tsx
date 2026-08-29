import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">Launch Financial</div>
        <div className="auth-sub">Log in to your simulated investing account</div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <div className="row spread" style={{ marginBottom: 6 }}>
              <label style={{ margin: 0 }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: 13, color: "var(--accent)" }}>
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              required
            />
          </div>
          <button className="btn btn-block" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>
        <div className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </div>
        <div className="demo-hint">
          Real market prices, simulated money. No real funds involved.
        </div>
      </div>
    </div>
  );
}
