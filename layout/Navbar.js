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
        <h1>EchoAlly</h1>
      </div>
      <Link href="/dashboard">Home</Link>
      <Link href="/about">About</Link>
      <Link href="/pricing">Pricing</Link>
      {user ? (
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
      ) : (
        <Link href="/signin/">Sign In</Link>
      )}
    </nav>
  );
};

export default Navbar;
