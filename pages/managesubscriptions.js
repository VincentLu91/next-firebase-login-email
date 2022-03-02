import React, { useState, useEffect, useCallback } from "react";
import db, { auth } from "../firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
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

const ManageSubscriptions = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.user.currentUser);
  const [products, setProducts] = useState([]);
  const [subscription, setSubscription] = useState(null);

  const [loading, setLoading] = useState(false);
  const getSubscriptionsInfo = useCallback(async (user) => {
    const subscriptionsRef = collection(
      db,
      `customers/${user.uid}/subscriptions`
    );
    const q = query(subscriptionsRef);
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((subscription) => {
      setSubscription({
        role: subscription.data().role,
        subscriptionId: subscription.id,
        current_period_start: subscription.data().current_period_start,
        current_period_end: subscription.data().current_period_end,
      });
    });
  }, []);

  const checkAuth = useCallback(
    async (user) => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          // User is signed in, see docs for a list of available properties
          // https://firebase.google.com/docs/reference/js/firebase.User
          getSubscriptionsInfo(user);
        } else {
          // User is signed out
          router.push("/signin");
        }
      });
    },
    [router, getSubscriptionsInfo]
  );

  // create useEffect to track user's subscriptions...
  useEffect(() => {
    checkAuth(currentUser);
  }, [checkAuth, currentUser]);

  const getProductsDisplay = useCallback(async () => {
    const productsRef = collection(db, "products");
    const q = query(productsRef, where("active", "==", true));
    const querySnapshot = await getDocs(q);
    const products = {};
    querySnapshot.forEach(async (productDoc) => {
      products[productDoc.id] = productDoc.data();
      const priceSnapshotList = query(
        collection(db, `products/${productDoc.id}/prices`)
      );
      const priceSnapshot = await getDocs(priceSnapshotList);
      priceSnapshot.forEach((priceDoc) => {
        products[productDoc.id].prices = {
          priceId: priceDoc.id,
          priceData: priceDoc.data(),
        };
      });
    });
    setProducts(products);
  }, []);
  useEffect(() => {
    getProductsDisplay();
  }, [getProductsDisplay]);

  // have no subscription
  const checkOut = async (priceId) => {
    const docRef = await addDoc(
      collection(db, `customers/${currentUser.user.uid}/checkout_sessions`),
      {
        price: priceId,
        success_url: window.location.origin,
        cancel_url: window.location.origin,
      }
    );
    onSnapshot(docRef, async (snap) => {
      const { error, sessionId } = snap.data();
      if (error) {
        alert(error.message);
      }
      if (sessionId) {
        const stripe = await loadStripe(
          "pk_test_51Jx1cdLBlaDAR7THzsOatgkQk8OYrYzoeZzljbQTVZvd8rcGrlrWxqmDxuLtA2waXPYnOHBIlxjWI4PMjjF8Otxa00naRp98mK"
        );
        stripe.redirectToCheckout({ sessionId });
      }
    });
  };

  //Stripe APIs
  const switchPlan = async (currentSubscriptionId, newPriceId) => {
    await checkAuth(currentUser);
    setLoading(true);
    try {
      const functions = getFunctions();
      const addMessage = httpsCallable(functions, "stripeSwitchPlans");
      console.log(currentUser);
      addMessage({
        stripeSubscriptionId: currentSubscriptionId,
        newPriceId: newPriceId,
        customerId: currentUser.uid,
      }).then((result) => {
        // Read result of the Cloud Function.
        /** @type {any} */
        const data = result.data;
        console.log(data);
      });
    } catch (error) {
      console.log(error);
      alert("Failed");
    }
    //setSubscription(null);
    await checkAuth(currentUser);
    setLoading(false);
    //window.location.reload(true); // workaround for screen refresh
    router.push("/dashboard");
  };

  const cancelPlan = async (currentSubscriptionId) => {
    await checkAuth(currentUser);
    setLoading(true);
    await axios.post("http://localhost:8080/stripe/cancel-subscription", {
      stripeSubscriptionId: currentSubscriptionId,
    });
    setSubscription(null);
    await checkAuth(currentUser);
    setLoading(false);
    window.location.reload(true);
    //router.push("/dashboard");
  };
  return (
    <div>
      <button onClick={() => router.push("/dashboard")}>
        Back to Dashboard
      </button>
      <h1>ManageSubscriptions</h1>
      {loading && (
        <div>
          <h3>Updating Subscriptions...</h3>
        </div>
      )}
      <div className="plans-container">
        {Object.entries(products).map(([productId, productData]) => {
          const isCurrentPlan = productData?.name
            ?.toLowerCase()
            .includes(subscription?.role);
          return (
            <div className="plans" key={productId}>
              <div>
                {productData.name} - {productData.description}
              </div>
              <button
                className={isCurrentPlan && "subscribed" ? "subscribed" : null}
                disabled={isCurrentPlan}
                onClick={() =>
                  subscription?.role
                    ? isCurrentPlan
                      ? undefined
                      : switchPlan(
                          subscription.subscriptionId,
                          productData.prices.priceId
                        )
                    : checkOut(productData.prices.priceId)
                }
              >
                {subscription?.role
                  ? isCurrentPlan
                    ? "Subscribed"
                    : "Switch Plan"
                  : "Buy Plan"}
              </button>
              {isCurrentPlan && (
                <button onClick={() => cancelPlan(subscription.subscriptionId)}>
                  Cancel
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ManageSubscriptions;
