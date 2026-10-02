import { ReactNode } from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Home", icon: "🏠", end: true },
  { to: "/portfolio", label: "Portfolio", icon: "📊" },
  { to: "/market", label: "Market", icon: "📈" },
  { to: "/learn", label: "Learn", icon: "🎓" },
  { to: "/coach", label: "Coach", icon: "🧑‍🏫" },
  { to: "/watchlist", label: "Watchlist", icon: "⭐" },
  { to: "/activity", label: "Activity", icon: "📄" },
  { to: "/funding", label: "Transfer", icon: "💸" },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Launch Financial</div>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon" aria-hidden>
              {l.icon}
            </span>
            <span className="nav-label">{l.label}</span>
          </NavLink>
        ))}
        <div className="sidebar-footer">
          <Link
            to="/profile"
            className="nav-link"
            style={{ display: "block", padding: "8px 12px" }}
          >
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              View profile
            </div>
          </Link>
          <button
            className="nav-link nav-logout"
            style={{ background: "transparent", border: "none", textAlign: "left", width: "100%" }}
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
