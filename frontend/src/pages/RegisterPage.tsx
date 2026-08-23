import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({ firstName, lastName, email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">Wealthsimple</div>
        <div className="auth-sub">Create your simulated investing account</div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>First name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Last name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>
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
              placeholder="At least 8 characters"
              required
            />
          </div>
          <button className="btn btn-block" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <div className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
        <div className="demo-hint">
          You'll start with a Personal account. Add mock money from the "Move money" page to begin
          trading. Everything is simulated.
        </div>
      </div>
    </div>
  );
}
