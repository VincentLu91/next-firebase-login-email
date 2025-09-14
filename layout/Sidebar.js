import Link from "next/link";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import Footer from "./Footer";

const NavSection = ({ title, children }) => (
  <div className="nav-section">
    <p className="nav-section-title">{title}</p>
    <div className="nav-items">{children}</div>
  </div>
);

const NavItem = ({ href, children, active }) => (
  <div style={{ width: "100%" }}>
    <Link href={href} className={`nav-item ${active ? "active" : ""}`}>
      {children}
    </Link>
  </div>
);

const Sidebar = () => {
  const dispatch = useDispatch();
  const user = useUser();
  const supabase = useSupabaseClient();
  const callControlID = useSelector(
    (state) => state.recordingReducer.callControlID
  );

  const handleSignOut = async () => {
    try {
      if (callControlID) {
        // best-effort; don't block logout if these fail
        try {
          await axios.post("/api/hangup", { callControlID });
        } catch {}
        try {
          await axios.post("/api/calls-token", { user: user?.id || null });
        } catch {}
      }

      // Prefer local scope; avoids 403 if refresh token is already rotated/invalid
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});

      // Ensure Redux-persist doesn't instantly rehydrate old state
      try {
        localStorage.removeItem("persist:root");
      } catch {}
    } finally {
      // Hard reload to kill any lingering auto-refresh listeners
      window.location.href = "/signin";
    }
  };

  return (
    <nav
      className="sidebar-nav"
      aria-label="Primary"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <div className="sidebar-inner">
        <NavSection title="DASHBOARD">
          <ul className="nav-list">
            <li className="nav-li">
              <Link href="/dashboard" legacyBehavior>
                <a className="nav-item">Audio List and Transcript</a>
              </Link>
            </li>
            <li className="nav-li">
              <Link href="/audioplayer" legacyBehavior>
                <a className="nav-item">Chat with your Audio</a>
              </Link>
            </li>
          </ul>
        </NavSection>

        <NavSection title="RECORDING AND TRANSCRIBE">
          <ul className="nav-list">
            <li className="nav-li">
              <Link href="/internalrecording" legacyBehavior>
                <a className="nav-item">Mic Recording</a>
              </Link>
            </li>
            <li className="nav-li">
              <Link href="/phonerecording2" legacyBehavior>
                <a className="nav-item">Phone Call Recording</a>
              </Link>
            </li>
          </ul>
        </NavSection>

        {user && (
          <NavSection title="ACCOUNT">
            <ul className="nav-list">
              <li className="nav-li">
                <Link href="/managesubscriptions" legacyBehavior>
                  <a className="nav-item">Settings</a>
                </Link>
              </li>
              <li className="nav-li">
                <Link href="/pricing" legacyBehavior>
                  <a className="nav-item">Subscription</a>
                </Link>
              </li>
              <li className="nav-li">
                <button className="nav-item nav-button" onClick={handleSignOut}>
                  Sign Out
                </button>
              </li>
            </ul>
          </NavSection>
        )}
      </div>

      <div className="footer-container">
        <Footer />
      </div>

      {/* STYLES BELOW */}
      <style jsx>{`
        .sidebar-inner {
          padding: var(--space-4) var(--space-3);
        }

        .nav-section {
          margin-bottom: var(--space-5);
        }

        .nav-section-title {
          font-size: 11px;
          line-height: 1;
          font-weight: 700;
          color: var(--text-400);
          padding: 0 var(--space-3);
          margin: 0 0 var(--space-2);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          opacity: 0.9;
        }

        /* Solid list model = guaranteed stacking + indent */
        .nav-list {
          list-style: none;
          margin: 0;
          padding: 0 0 0 var(--space-3); /* indent under the title */
          display: grid;
          grid-auto-rows: minmax(44px, auto); /* touch target */
          row-gap: 6px; /* breathing room between items */
        }

        .nav-li {
          width: 100%;
        }

        .nav-item {
          display: block;
          width: 100%;
          padding: 0 var(--space-3);
          border-radius: 10px;
          color: var(--text-300);
          font-weight: 520;
          line-height: 44px; /* center text within 44px row */
          text-align: left;
          transition: background 160ms ease, color 160ms ease,
            box-shadow 160ms ease;
          outline: none;
        }

        /* Uniform button look for Sign Out */
        .nav-button {
          background: transparent;
          border: 0;
          cursor: pointer;
          font: inherit;
          color: inherit;
        }

        .nav-item:hover,
        .nav-item:focus-visible {
          background: var(--bg-700);
          color: var(--text-100);
        }

        /* Slim left accent for active state (cleaner than thick border) */
        .nav-item.active {
          box-shadow: inset 3px 0 0 0 var(--accent-500);
          background: var(--bg-700);
          color: var(--text-100);
        }

        .footer-container {
          margin-top: auto;
          padding: var(--space-4) var(--space-4) var(--space-5);
        }

        .footer-container :global(.footerstyle) {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .footer-container :global(.footerstyle a) {
          color: var(--text-300);
          font-size: 14px;
          transition: color 160ms ease;
        }

        .footer-container :global(.footerstyle a:hover) {
          color: var(--text-100);
        }

        @media (max-width: 768px) {
          .sidebar-inner {
            padding: var(--space-2);
          }
          .nav-section-title {
            display: none;
          }
          .nav-list {
            padding-left: 0;
            row-gap: 4px;
          }
          .nav-item {
            text-align: center;
          }
        }
        /* DENSITY CONTROLS — add near the top of your sidebar styles */
        .sidebar-nav {
          --nav-row-height: 34px; /* was 44px */
          --nav-row-gap: 2px; /* was 6px */
          --nav-section-gap: var(--space-3); /* space between sections */
        }

        /* Make sections a bit closer together */
        .nav-section {
          margin-bottom: var(--nav-section-gap);
        }

        /* Keep titles readable but tighter */
        .nav-section-title {
          margin: 0 0 var(--space-1); /* was var(--space-2) */
        }

        /* Tighter list rhythm */
        .nav-list {
          grid-auto-rows: var(--nav-row-height);
          row-gap: var(--nav-row-gap);
        }

        /* Ensure links/buttons match the new row height */
        .nav-item {
          line-height: var(--nav-row-height);
          padding: 0 var(--space-3);
          border-radius: 8px; /* optional, looks nicer when rows are smaller */
        }

        /* Button version (Sign Out) stays same height */
        .nav-button {
          line-height: var(--nav-row-height);
        }
      `}</style>
    </nav>
  );
};

export default Sidebar;
