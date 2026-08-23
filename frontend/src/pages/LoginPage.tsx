import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("demo@wealthsimple.dev");
  const [password, setPassword] = useState("password123");
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
        <div className="auth-brand">Wealthsimple</div>
        <div className="auth-sub">Log in to your simulated investing account</div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          Demo login is prefilled: <code>demo@wealthsimple.dev</code> / <code>password123</code>
          <br />
          All money and prices are simulated. No real funds involved.
        </div>
      </div>
    </div>
  );
}
