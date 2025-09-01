import Link from "next/link";
import { useUser } from "@supabase/auth-helpers-react";

const Header = ({ onUtilityToggle }) => {
  const user = useUser();

  return (
    <header className="app-header">
      <div className="header-left">
        <Link href="/" className="header-logo">
          <h1>EchoAlly</h1>
        </Link>
      </div>

      {/*<div className="header-search">
        <input
          type="search"
          placeholder="Search for recordings, transcripts..."
          aria-label="Search"
        />
      </div>*/}

      <div className="header-right">
        {!user && (
          <Link href="/signin">
            <button className="btn-muted">Sign In</button>
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;
