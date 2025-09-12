import Link from "next/link";
import { useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "../utils/initSupabase";

const Header = ({ onUtilityToggle }) => {
  const router = useRouter();
  const user = useUser();
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    const checkSubscription = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("customer_id", user.id)
          .single();

        if (!error) {
          setSubscription(data);
        }
      }
    };

    checkSubscription();
  }, [user]);

  return (
    <header className="app-header">
      <div className="header-left">
        <Link href="/" className="header-logo">
          <h1>EchoAlly</h1>
        </Link>
      </div>

      <nav className="header-nav">
        <Link href="/pricing" className="nav-link">
          Pricing
        </Link>
        <Link href="/about" className="nav-link">
          About
        </Link>
        <Link href="/contact" className="nav-link">
          Contact
        </Link>
        <Link href="/dashboard" className="nav-link">
          Dashboard
        </Link>
      </nav>

      {user && (!subscription || subscription?.cancel_at_period_end) && (
        <div className="header-cta">
          <span className="cta-text">
            Unlock More with a Free Trial! Start your 15-day free trial to
            transcribe longer convos — no card required.
          </span>
          <button
            onClick={() => router.push("/pricing")}
            className="btn-primary-compact"
          >
            Start Free Trial
          </button>
        </div>
      )}

      <div className="header-right">
        {!user && (
          <button
            onClick={() => router.push("/signin")}
            className="btn-muted-compact"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
