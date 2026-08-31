import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { checkEmail } from "../lib/email";

export default function RegisterPage() {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailHint = useMemo(() => checkEmail(email), [email]);
  const showEmailHint = emailTouched && email.length > 0 && !emailHint.ok;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    // Block obviously-bad emails before hitting the server.
    const hint = checkEmail(email);
    if (!hint.ok) {
      setEmailTouched(true);
      setError(hint.message || "Enter a valid email address");
      return;
    }
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
        <div className="auth-brand">Launch Financial</div>
        <div className="auth-sub">Create your simulated investing account</div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>First name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                required
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Last name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                required
              />
            </div>
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
            {showEmailHint && (
              <div className="field-hint">
                {emailHint.message}
                {emailHint.suggestion && (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      setEmail(emailHint.suggestion!);
                      setEmailTouched(true);
                    }}
                  >
                    Use it
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
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
          You'll open your first account from the "Transfer" page after signing up. Everything is
          simulated.
        </div>
      </div>
    </div>
  );
}
