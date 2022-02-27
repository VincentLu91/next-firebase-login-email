import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import db, { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, getDocs, orderBy } from "firebase/firestore";

const Plan3 = (props) => {
  const router = useRouter();
  const currentUser = useSelector((state) => state.user.currentUser);
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
  if (!subscription) return null;

  return (
    <>
      <button onClick={() => router.push("/dashboard")}>
        Back to Dashboard
      </button>
      {["plan3"].includes(subscription.role) && (
        <div>You are in plan3 subscription and thus, viewing Plan3 content</div>
      )}
      {!["plan3"].includes(subscription.role) && (
        <div>You are not in plan3!</div>
      )}
    </>
  );
};

export default Plan3;
