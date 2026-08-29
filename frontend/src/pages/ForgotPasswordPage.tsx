import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { User } from "../api/types";

type Step = "request" | "reset";

export default function ForgotPasswordPage() {
  const { applyAuth } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setInfo("If an account exists for that email, we've sent a 6-digit reset code. Enter it below.");
      setStep("reset");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: User }>("/auth/reset-password", {
        email,
        code: code.trim(),
        newPassword,
      });
      // Reset succeeded and returns a session — log straight in.
      applyAuth(res.token, res.user);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">Launch Financial</div>
        <div className="auth-sub">
          {step === "request" ? "Reset your password" : "Enter your reset code"}
        </div>

        {error && <div className="error-banner">{error}</div>}
        {info && <div className="success-banner">{info}</div>}

        {step === "request" ? (
          <form onSubmit={requestCode}>
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
            <button className="btn btn-block" disabled={loading}>
              {loading ? "Sending…" : "Send reset code"}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword}>
            <div className="field">
              <label>6-digit code</label>
              <input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                required
              />
            </div>
            <div className="field">
              <label>New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
              />
            </div>
            <div className="field">
              <label>Confirm new password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <button className="btn btn-block" disabled={loading}>
              {loading ? "Resetting…" : "Reset password & log in"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-block mt-8"
              onClick={() => {
                setStep("request");
                setError("");
                setInfo("");
              }}
            >
              Use a different email
            </button>
          </form>
        )}

        <div className="auth-switch">
          Remembered it? <Link to="/login">Back to log in</Link>
        </div>
      </div>
    </div>
  );
}
