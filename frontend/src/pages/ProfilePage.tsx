import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

/** Small helper to render a status message under a form section. */
function Status({ error, success }: { error?: string; success?: string }) {
  if (error) return <div className="error-banner">{error}</div>;
  if (success) return <div className="success-banner">{success}</div>;
  return null;
}

export default function ProfilePage() {
  const { user, updateProfile, changeEmail, changePassword, deleteAccount, logout } = useAuth();
  const navigate = useNavigate();

  // Name
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [nameMsg, setNameMsg] = useState<{ error?: string; success?: string }>({});
  const [nameBusy, setNameBusy] = useState(false);

  // Email
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailMsg, setEmailMsg] = useState<{ error?: string; success?: string }>({});
  const [emailBusy, setEmailBusy] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<{ error?: string; success?: string }>({});
  const [pwBusy, setPwBusy] = useState(false);

  // Delete
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteMsg, setDeleteMsg] = useState<{ error?: string }>({});
  const [deleteBusy, setDeleteBusy] = useState(false);

  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setNameMsg({});
    setNameBusy(true);
    try {
      await updateProfile(firstName.trim(), lastName.trim());
      setNameMsg({ success: "Name updated." });
    } catch (err) {
      setNameMsg({ error: err instanceof ApiError ? err.message : "Could not update name" });
    } finally {
      setNameBusy(false);
    }
  }

  async function saveEmail(e: FormEvent) {
    e.preventDefault();
    setEmailMsg({});
    setEmailBusy(true);
    try {
      await changeEmail(newEmail.trim(), emailPassword);
      setEmailMsg({ success: "Email updated." });
      setNewEmail("");
      setEmailPassword("");
    } catch (err) {
      setEmailMsg({ error: err instanceof ApiError ? err.message : "Could not change email" });
    } finally {
      setEmailBusy(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg({});
    if (newPassword !== confirmPassword) {
      setPwMsg({ error: "New passwords don't match" });
      return;
    }
    setPwBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPwMsg({ success: "Password changed." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwMsg({ error: err instanceof ApiError ? err.message : "Could not change password" });
    } finally {
      setPwBusy(false);
    }
  }

  async function confirmDelete(e: FormEvent) {
    e.preventDefault();
    setDeleteMsg({});
    setDeleteBusy(true);
    try {
      await deleteAccount(deletePassword);
      navigate("/login");
    } catch (err) {
      setDeleteMsg({ error: err instanceof ApiError ? err.message : "Could not delete account" });
      setDeleteBusy(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Profile</h1>
      <p className="page-sub">Manage your account and security.</p>

      {/* Account overview */}
      <div className="card">
        <div className="row spread">
          <div>
            <div className="stat-label">Signed in as</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div className="muted">{user?.email}</div>
            {joined && (
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                Member since {joined}
              </div>
            )}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Log out
          </button>
        </div>
      </div>

      {/* Edit name */}
      <div className="card mt-16">
        <h3 style={{ marginTop: 0 }}>Name</h3>
        <Status error={nameMsg.error} success={nameMsg.success} />
        <form onSubmit={saveName}>
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
          <button className="btn btn-sm" disabled={nameBusy}>
            {nameBusy ? "Saving…" : "Save name"}
          </button>
        </form>
      </div>

      {/* Change email */}
      <div className="card mt-16">
        <h3 style={{ marginTop: 0 }}>Email</h3>
        <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>
          Current: <strong>{user?.email}</strong>
        </p>
        <Status error={emailMsg.error} success={emailMsg.success} />
        <form onSubmit={saveEmail}>
          <div className="field">
            <label>New email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@example.com"
              required
            />
          </div>
          <div className="field">
            <label>Current password</label>
            <input
              type="password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button className="btn btn-sm" disabled={emailBusy}>
            {emailBusy ? "Updating…" : "Update email"}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card mt-16">
        <h3 style={{ marginTop: 0 }}>Password</h3>
        <Status error={pwMsg.error} success={pwMsg.success} />
        <form onSubmit={savePassword}>
          <div className="field">
            <label>Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
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
            <div className="field" style={{ flex: 1 }}>
              <label>Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          </div>
          <button className="btn btn-sm" disabled={pwBusy}>
            {pwBusy ? "Changing…" : "Change password"}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="card mt-16" style={{ borderColor: "var(--loss)" }}>
        <h3 style={{ marginTop: 0, color: "var(--loss)" }}>Delete account</h3>
        <p className="muted" style={{ fontSize: 14 }}>
          Permanently deletes your account and all data — accounts, positions, activity, watchlist,
          and learning progress. This cannot be undone.
        </p>
        {!showDelete ? (
          <button className="btn btn-danger btn-sm" onClick={() => setShowDelete(true)}>
            Delete my account
          </button>
        ) : (
          <form onSubmit={confirmDelete}>
            <Status error={deleteMsg.error} />
            <div className="field">
              <label>Enter your password to confirm</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn btn-danger btn-sm" disabled={deleteBusy}>
                {deleteBusy ? "Deleting…" : "Permanently delete"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setShowDelete(false);
                  setDeletePassword("");
                  setDeleteMsg({});
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
