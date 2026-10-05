import { ReactNode, useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation, Link } from "react-router-dom";
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
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Always close the drawer when the route actually changes, so the menu and
  // the rendered page never drift out of sync (addresses the intermittent
  // "active tab moved but page didn't" behavior on mobile).
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock background scroll while the full-screen drawer is open.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const navItems = (
    <>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          onClick={() => setDrawerOpen(false)}
        >
          <span className="nav-icon" aria-hidden>
            {l.icon}
          </span>
          <span className="nav-label">{l.label}</span>
        </NavLink>
      ))}
    </>
  );

  const footer = (
    <div className="sidebar-footer">
      <Link
        to="/profile"
        className="nav-link"
        style={{ display: "flex", gap: 10, padding: "8px 12px" }}
        onClick={() => setDrawerOpen(false)}
      >
        <span className="nav-icon" aria-hidden>
          👤
        </span>
        <span>
          <span style={{ fontWeight: 600, fontSize: 14, display: "block" }}>
            {user?.firstName} {user?.lastName}
          </span>
          <span className="muted" style={{ fontSize: 12 }}>
            View profile
          </span>
        </span>
      </Link>
      <button
        className="nav-link nav-logout"
        style={{ background: "transparent", border: "none", textAlign: "left", width: "100%" }}
        onClick={() => {
          setDrawerOpen(false);
          logout();
          navigate("/login");
        }}
      >
        <span className="nav-icon" aria-hidden>
          🚪
        </span>
        <span>Log out</span>
      </button>
    </div>
  );

  return (
    <div className="app-shell">
      {/* Desktop: persistent left sidebar. */}
      <aside className="sidebar">
        <div className="brand">Launch Financial</div>
        {navItems}
        {footer}
      </aside>

      {/* Mobile: slim top bar with a hamburger that opens a labeled drawer. */}
      <header className="topbar">
        <div className="brand">Launch Financial</div>
        <button
          className="topbar-menu-btn"
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          ☰
        </button>
      </header>

      {/* Full-screen drawer (mobile). Tapping a row navigates + closes; the ✕
          (or the backdrop) closes without leaving the current page. */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <nav
            className="drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Navigation menu"
          >
            <div className="drawer-head">
              <div className="brand" style={{ padding: 0 }}>
                Launch Financial
              </div>
              <button
                className="drawer-close"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="drawer-links">{navItems}</div>
            {footer}
          </nav>
        </div>
      )}

      <main className="main">{children}</main>
    </div>
  );
}
