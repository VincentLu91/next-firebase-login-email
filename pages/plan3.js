import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";

const Plan3 = (props) => {
  const router = useRouter();
  const user = useUser();
  const supabase = useSupabaseClient();
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);

  const checkAuth = useCallback(
    async (user) => {
      if (user) {
        console.log("Supabase user is: ", user);
        let customerInfo = await supabase
          .from("customers")
          .select("*")
          .eq("email_address", user.email);
        console.log("customerInfo is: ", customerInfo.data[0]); //customerInfo.data[0].id
        let subscriptionResponse = await supabase
          .from("subscriptions")
          .select()
          .eq("customer_id", customerInfo.data[0].id);
        console.log(
          "subscriptionResponse is: ",
          subscriptionResponse.data[0].stripe_product_name
        );
        setSubscriptionInfo(subscriptionResponse.data[0].stripe_product_name);
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
    checkAuth(user);
  }, [checkAuth, user]);

  return (
    <>
      <button onClick={() => router.push("/dashboard")}>
        Back to Dashboard
      </button>
      {["plan3"].includes(subscriptionInfo) && (
        <div>You are in plan3 subscription and thus, viewing Plan3 content</div>
      )}
      {!["plan3"].includes(subscriptionInfo) && (
        <div>You are not in plan3!</div>
      )}
    </>
  );
};

export default Plan3;
