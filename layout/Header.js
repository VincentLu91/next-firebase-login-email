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
    <header className="app-header flex items-center justify-between">
      <div className="header-left">
        <Link href="/" className="header-logo">
          <h1>EchoAlly</h1>
        </Link>
      </div>

      <nav className="flex items-center space-x-6 mx-6">
        <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
          Pricing
        </Link>
        <Link href="/signin" className="text-gray-600 hover:text-gray-900">
          Signin
        </Link>
        <Link href="/contact" className="text-gray-600 hover:text-gray-900">
          Contact
        </Link>
        <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
          Dashboard
        </Link>
      </nav>

      {/*<div className="header-search">
        <input
          type="search"
          placeholder="Search for recordings, transcripts..."
          aria-label="Search"
        />
      </div>*/}

      {user && (!subscription || subscription?.cancel_at_period_end) && (
        <div className="flex-1 flex items-center justify-center mx-4">
          <span className="text-blue-800 mr-4">
            Unlock More with a Free Trial! Start your 15-day free trial to
            transcribe longer convos — no card required.
          </span>
          <button
            onClick={() => router.push("/pricing")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors whitespace-nowrap flex-shrink-0"
          >
            Start Free Trial
          </button>
        </div>
      )}

      <div className="header-right">
        {!user && (
          <button onClick={() => router.push("/signin")} className="btn-muted">
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
