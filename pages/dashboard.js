import React, { useState, useEffect, useCallback } from "react";
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
          InternalRecording (which works on audio recording too)
        </button>
        <button onClick={() => router.push("/library")}>Library</button>
      </p>

      <style jsx>{dashboardStyles}</style>
    </div>
  );
};

export default Dashboard;
