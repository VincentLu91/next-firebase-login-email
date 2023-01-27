import dynamic from "next/dynamic";
import React, { useState, useEffect, useCallback, useRef } from "react";
import db, { auth } from "../firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { useUser } from "@supabase/auth-helpers-react";

const ComponentWithNoSSR = dynamic(() => import("../components/Recording"), {
  ssr: false,
});

const InternalRecording = () => {
  const router = useRouter();
  const user = useUser();
  // old firebase code
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
          router.push("/signin");
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

  const checkAuth = useCallback(
    async (user) => {
      if (user) {
        console.log("Supabase user is: ", user);
      } else {
        // User is signed out
        console.log(
          "The user is inauthenticated, redirecting back to signin page"
        );
        router.push("/signin");
      }
    },
    [router]
  );

  useEffect(() => {
    //console.log("Current user is: ", currentUser);
    checkAuth(user);
    //getSubscriptionsInfo();
  }, [checkAuth, user]);
  return <ComponentWithNoSSR />;
};

export default InternalRecording;
