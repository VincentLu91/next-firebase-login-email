import Link from "next/link";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import Footer from "./Footer";

const NavSection = ({ title, children }) => (
  <div className="nav-section">
    <h2 className="nav-section-title">{title}</h2>
    {children}
  </div>
);

const NavItem = ({ href, children, active }) => (
  <Link href={href} className={`nav-item ${active ? "active" : ""}`}>
    {children}
  </Link>
);

const Sidebar = () => {
  const dispatch = useDispatch();
  const user = useUser();
  const supabase = useSupabaseClient();
  const callControlID = useSelector(
    (state) => state.recordingReducer.callControlID
  );

  const handleSignOut = () => {
    if (callControlID) {
      axios.post(`/api/hangup?callControlID=${callControlID}`);
      axios.post(`/api/calls-token?user=${user.id}`);
    }
    supabase.auth.signOut();
    dispatch({ type: "SIGNED_OUT" });
  };

  return (
    <nav
      className="sidebar-nav"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <NavSection title="LIBRARY">
        <NavItem href="/dashboard">Dashboard</NavItem>
        <NavItem href="/audioplayer">Recordings</NavItem>
        <NavItem href="/internalrecording">Voice Notes</NavItem>
      </NavSection>

      <NavSection title="WORKSPACE">
        <NavItem href="/phonerecording2">Phone Calls</NavItem>
      </NavSection>

      {user && (
        <NavSection title="ACCOUNT">
          <NavItem href="/managesubscriptions">Settings</NavItem>
          <NavItem href="/pricing">Subscription</NavItem>
          <button
            className="nav-item sign-out-btn"
            onClick={handleSignOut}
            style={{
              width: "100%",
              border: "none",
              background: "none",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              fontSize: "inherit",
            }}
          >
            Sign Out
          </button>
        </NavSection>
      )}

      <div className="footer-container">
        <Footer />
      </div>

      <style jsx>{`
        .nav-section {
          padding: var(--space-4) 0;
        }

        .nav-section-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-300);
          padding: 0 var(--space-4);
          margin: 0 0 var(--space-2);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .nav-item {
          height: 40px;
          padding: 0 var(--space-4);
          display: flex;
          align-items: center;
          color: var(--text-300);
          font-weight: 500;
          transition: var(--transition-base);
        }

        .nav-item:hover {
          background: var(--bg-700);
          color: var(--text-100);
        }

        .nav-item.active {
          background: var(--bg-700);
          color: var(--text-100);
          border-left: 3px solid var(--accent-500);
        }

        .footer-container {
          margin-top: auto;
          padding: var(--space-4);
        }

        .footer-container :global(.footerstyle) {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .footer-container :global(.footerstyle a) {
          color: var(--text-300);
          font-size: 14px;
          transition: var(--transition-base);
        }

        .footer-container :global(.footerstyle a:hover) {
          color: var(--text-100);
        }

        @media (max-width: 768px) {
          .nav-section-title {
            display: none;
          }

          .nav-item {
            justify-content: center;
            padding: 0;
          }

          .sign-out-btn {
            justify-content: center;
          }
        }
      `}</style>
    </nav>
  );
};

export default Sidebar;
