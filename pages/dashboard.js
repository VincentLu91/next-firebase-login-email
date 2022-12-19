import React, { useState, useEffect, useCallback, useRef } from "react";
import db, { auth } from "../firebase";
import { signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  deleteDoc,
  orderBy,
} from "firebase/firestore";
import { loadStripe } from "@stripe/stripe-js";
import axios from "axios";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { setSound } from "../redux/recording/actions";
import dashboardStyles from "../styles/dashboardStyles";
import Image from "next/image";

const Dashboard = () => {
  const router = useRouter();
  const dispatch = useDispatch();

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
  if (!subscription) return null;

  return (
    <div className="center">
      <h1 className="title">Welcome home</h1>
      <p>
        <button
          className="logout"
          onClick={() => {
            signOut(auth);
            //dispatch(setSound(null));
            dispatch({ type: "SIGNED_OUT" });
            router.push("/signin");
          }}
        >
          Sign out
        </button>
        <button onClick={() => router.push("/blog1")}>Go to Blog1</button>
        <br />
        <button onClick={() => router.push("/plan1")}>Go to Plan1</button>
        <button onClick={() => router.push("/plan2")}>Go to Plan2</button>
        <br />
        <button onClick={() => router.push("/plan3")}>Go to Plan3</button>
        <button onClick={() => router.push("/plan4")}>Go to Plan4</button>
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
      </p>

      <style jsx>{dashboardStyles}</style>
    </div>
  );
};

export default Dashboard;
