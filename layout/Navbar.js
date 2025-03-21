import Link from "next/link";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { useCallback, useState, useEffect } from "react";

const Navbar = () => {
  const dispatch = useDispatch();
  const user = useUser();
  const supabase = useSupabaseClient();
  const [customer, setCustomer] = useState(null);
  const callControlID = useSelector(
    (state) => state.recordingReducer.callControlID
  );
  const getCustomerInfo = useCallback(
    async (user) => {
      if (user) {
        let customerInfo = await supabase
          .from("customers")
          .select("*")
          .eq("email_address", user.email);
        console.log("customerInfo is: ", customerInfo.data[0]); //customerInfo.data[0].id
        setCustomer(customerInfo.data[0]);
      }
    },
    [supabase]
  );
  useEffect(() => {
    //console.log("Current user is: ", currentUser);
    getCustomerInfo(user);
    //getSubscriptionsInfo();
  }, [getCustomerInfo, user]);
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
          <Link href="/phonerecording2">Phone Recording2</Link>
          <a
            href="#"
            onClick={() => {
              if (callControlID) {
                console.log("upon signout, callControlID is: ", callControlID);
                axios.post(`/api/hangup?callControlID=${callControlID}`);
                axios.post(`/api/calls-token?user=${customer.id}`);
              }
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
