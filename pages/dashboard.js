import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { useDispatch } from "react-redux";
import { setSound } from "../redux/recording/actions";
import dashboardStyles from "../styles/dashboardStyles";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";

const Dashboard = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useUser();
  const supabase = useSupabaseClient();
  const [emailAddress, setEmailAddress] = useState(null);

  const checkAuth = useCallback(
    async (user) => {
      if (user) {
        console.log("Supabase user is: ", user);
        let customerInfo = await supabase
          .from("customers")
          .select("*")
          .eq("email_address", user.email);
        console.log("customerInfo is: ", customerInfo.data[0]);
        if (!customerInfo.data[0]) {
          // say if the user created their account for the first time, then create a customer row for them.
          customerInfo = await supabase
            .from("customers")
            .insert([{ email_address: user.email }])
            .select();
          if (customerInfo.error) {
            console.log("Cannot create customer, see error: ");
            console.log(customerInfo.error);
          }
          if (customerInfo.data) {
            console.log("Customer Success!");
            console.log(customerInfo.data);
          }
        } else {
          //console.log("customerInfo is: ", customerInfo.data[0]); //customerInfo.data[0].id
          setEmailAddress(customerInfo.data[0].email_address);
          let subscriptionResponse = await supabase
            .from("subscriptions")
            .select()
            .eq("customer_id", customerInfo.data[0].id);
          console.log("subscriptionResponse is: ", subscriptionResponse);
        }
      } else {
        // User is signed out
        console.log(
          "The user is inauthenticated, redirecting back to signin page"
        );
        router.push("/signin");
      }
    },
    [router, supabase]
  );

  useEffect(() => {
    //console.log("Current user is: ", currentUser);
    checkAuth(user);
  }, [checkAuth, user]);

  return (
    <div className="center">
      <h1 className="title">Welcome home {emailAddress}</h1>
      <p>
        <button
          className="logout"
          onClick={() => {
            //signOut(auth);
            supabase.auth.signOut(); // had to call this twice for some reason
            //dispatch(setSound(null));
            dispatch({ type: "SIGNED_OUT" });
          }}
        >
          Sign out
        </button>
        {/*<button onClick={() => router.push("/blog1")}>Go to Blog1</button>*/}
        <br />
        {/*<button onClick={() => router.push("/plan1")}>Go to Plan1</button>*/}
        {/*<button onClick={() => router.push("/plan2")}>Go to Plan2</button>*/}
        <br />
        {/*<button onClick={() => router.push("/plan3")}>Go to Plan3</button>*/}
        {/*<button onClick={() => router.push("/plan4")}>Go to Plan4</button>*/}
        <br />
        <button onClick={() => router.push("/audioplayer")}>AudioPlayer</button>
        <button onClick={() => router.push("/managesubscriptions")}>
          Manage Subscriptions
        </button>
        <br />
        <button onClick={() => router.push("/internalrecording")}>
          Recording
        </button>
        <button onClick={() => router.push("/library")}>Library</button>
        <button onClick={() => router.push("/phonerecording")}>
          Phone Recording
        </button>
      </p>

      <style jsx>{dashboardStyles}</style>
      {/*console.log("Supabase user is: ", user)*/}
      {console.log("supabase obj is: ", supabase.auth)}
    </div>
  );
};

export default Dashboard;
