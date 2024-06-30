import Link from "next/link";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useDispatch } from "react-redux";

const Navbar = () => {
  const dispatch = useDispatch();
  const user = useUser();
  const supabase = useSupabaseClient();
  return (
    <nav>
      <div className="logo">
        <Link href="/">
          <h1>EchoAlly</h1>
        </Link>
      </div>
      <Link href="/dashboard">Dashboard</Link>
      {user ? (
        <Link href="/managesubscriptions">Account</Link>
      ) : (
        <Link href="/pricing">Pricing</Link>
      )}
      {user ? (
        <>
          <Link href="/audioplayer">AudioPlayer</Link>
          <Link href="/internalrecording">Recording</Link>
          <Link href="/phonerecording">Phone Recording</Link>
          <a
            href="#"
            onClick={() => {
              //signOut(auth);
              supabase.auth.signOut(); // had to call this twice for some reason
              //dispatch(setSound(null));
              dispatch({ type: "SIGNED_OUT" });
            }}
          >
            Sign Out
          </a>
        </>
      ) : (
        <Link href="/signin/">Sign In</Link>
      )}
    </nav>
  );
};

export default Navbar;
