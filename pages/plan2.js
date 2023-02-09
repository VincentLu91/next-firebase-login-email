import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import db, { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";

const Plan2 = (props) => {
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
    //console.log("Current user is: ", currentUser);
    checkAuth(user);
  }, [checkAuth, user]);
  /*const currentUser = useSelector((state) => state.user.currentUser);
  const [subscription, setSubscription] = useState(null);
  //console.log(userContext);
  async function getSubscriptionsInfo(user) {
    //if (!userContext.user) return;
    const subscriptionsRef = collection(
      db,
      //`customers/${userContext.user.uid}/subscriptions`
      `customers/${user.uid}/subscriptions` // why does this not work? update: it works, I had to call this fn in checkAuth()
      //`customers/CvKhT7Q8Ubeo4ImF3qToeJZBEJ22/subscriptions` // why does this work? because it identifies the ID upon useEffect
    );
    const q = query(subscriptionsRef, orderBy("created"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((subscription) => {
      console.log("subscription: ", subscription.id, subscription.data());
      setSubscription({
        role: subscription.data().role,
        subscriptionId: subscription.id,
        current_period_start: subscription.data().current_period_start,
        current_period_end: subscription.data().current_period_end,
      });
    });
  }

  const checkAuth = useCallback(
    async (user) => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          // User is signed in, see docs for a list of available properties
          // https://firebase.google.com/docs/reference/js/firebase.User
          const uid = user.uid;
          console.log("The user is authenticated with the uid: ", uid);
          getSubscriptionsInfo(user);
          // ...
        } else {
          // User is signed out
          // ...
          console.log(
            "The user is inauthenticated, redirecting back to signin page"
          );
          router.push("/");
        }
      });
    },
    [router]
  );

  // create useEffect to track user's subscriptions...
  useEffect(() => {
    //console.log("Current user is: ", currentUser);
    checkAuth(currentUser);
    //getSubscriptionsInfo();
  }, [checkAuth, currentUser]);
  console.log(currentUser);
  if (!subscription) return null;*/

  return (
    <>
      <button onClick={() => router.push("/dashboard")}>
        Back to Dashboard
      </button>
      {["plan2"].includes(subscriptionInfo) && (
        <div>You are in plan2 subscription and thus, viewing Plan2 content</div>
      )}
      {!["plan2"].includes(subscriptionInfo) && (
        <div>You are not in plan2!</div>
      )}
    </>
  );
};

export default Plan2;
