import React, { useState, useEffect, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import axios from "axios";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import dashboardStyles from "../styles/dashboardStyles";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";

const ManageSubscriptions = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const supabase = useSupabaseClient();
  const user = useUser();
  const [products, setProducts] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const [loading, setLoading] = useState(false);
  const checkAuth = useCallback(
    async (user) => {
      if (user) {
        console.log("Supabase user is: ", user);
        let customerInfo = await supabase
          .from("customers")
          .select("*")
          .eq("email_address", user.email);
        console.log("customerInfo is: ", customerInfo.data[0]); //customerInfo.data[0].id
        setCustomer(customerInfo.data[0]);
        let subscriptionResponse = await supabase
          .from("subscriptions")
          .select()
          .eq("customer_id", customerInfo.data[0].id);

        console.log("subscription REsponse >>>>>>", subscriptionResponse);
        if (!subscriptionResponse) {
          setIsSubscribed(false);
          setSubscriptionInfo(null);
        } else {
          if (!subscriptionResponse.data[0]) {
            setIsSubscribed(false);
            setSubscriptionInfo(null);
          } else {
            console.log(
              "subscriptionResponse is: ",
              subscriptionResponse.data[0].stripe_product_name
            );
            setIsSubscribed(true);
            setSubscriptionInfo(subscriptionResponse.data[0]);
          }
        }
        let micRecordingInfo = await supabase
          .from("mic_recordings")
          .select("*")
          .eq("customer_id", customerInfo.data[0].id);
        // setCloudRecordingList(micRecordingInfo.data);
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

  // this is to check for the user status and subscriptions before loading all recording objects
  useEffect(() => {
    checkAuth(user);
  }, [checkAuth, user]);

  useEffect(() => {
    // Connect to your server or WebSocket and handle incoming webhook events
    const socket = new WebSocket(
      "ws://f20e-70-50-62-54.ngrok.io/api/events/stripe"
    );
    socket.addEventListener("message", (event) => {
      const eventData = JSON.parse(event.data);
      console.log("Received webhook event in React:", eventData);
      // Update your React state or trigger an action based on the event
    });

    return () => {
      socket.close();
    };
  }, []);

  const getProductsDisplay = useCallback(async () => {
    let products = await supabase
      .from("products")
      .select("*, prices(*)")
      .eq("active", true);
    console.log("Products are: ", products);
    setProducts(products);
  }, [supabase]);
  useEffect(() => {
    getProductsDisplay();
  }, [getProductsDisplay]);

  // have no subscription
  const checkOut = async (priceId) => {
    const stripe = await loadStripe(
      "pk_test_51Jx1cdLBlaDAR7THzsOatgkQk8OYrYzoeZzljbQTVZvd8rcGrlrWxqmDxuLtA2waXPYnOHBIlxjWI4PMjjF8Otxa00naRp98mK"
    );
    // user/customer objects should already be present including stripe customer id
    // make request to backend to get session data
    // redirect user to sessions url

    const response = await axios.post(
      "http://localhost:3001/api/checkout_session", // I could rewrite this with environment specific URLs
      {
        success_url: `${window.location.origin}/subscription-checkout`,
        cancel_url: window.location.href,
        stripe_customer_id: customer?.stripe_customer_id,
        price_id: priceId,
      }
    );
    window.location.href = response.data.url; // by calling the API to start checkout, redirect user to checkout page

    /*let customerResponse = await supabase
      .from("customers")
      .insert([{}])
      .select();
    if (customerResponse.error) {
      console.log("Cannot insert, see error: ");
      console.log(customerResponse.error);
    }
    if (customerResponse.data) {
      console.log("Customer Success!");
      console.log(customerResponse.data);
    }*/
  };

  console.log("customer", customer);

  const updateSubscription = async (subscriptionObj, stripe_price_id) => {
    console.log("subscriptionObj is: ", subscriptionObj);
    //console.log("stripe_price_id is: ", stripe_price_id);
    let priceResponse = await supabase
      .from("prices")
      .select("*")
      .eq("stripe_price_id", stripe_price_id);
    console.log("priceResponse when switching plans is: ", priceResponse);
    let productResponse = await supabase
      .from("products")
      .select("*")
      .eq("stripe_product_id", priceResponse.data[0].stripe_product_id);
    console.log("productResponse when switching plans is: ", productResponse);
    let subscriptionUpdateResponse = await supabase
      .from("subscriptions")
      .update([
        {
          //stripe_subscription_id: res.data.subscription, // subscription id is the same no matter the product
          stripe_price_id: subscriptionObj.id,
          stripe_product_id: subscriptionObj.product,
          price_id: priceResponse.data[0].id,
          product_id: priceResponse.data[0].product_id,
          stripe_product_name: productResponse.data[0].product_name,
          //cancel_at_period_end: false,
        },
      ])
      .eq("customer_id", customer.id)
      .select();
    console.log("subscriptionUpdateResponse is: ", subscriptionUpdateResponse);
  };

  //Stripe APIs
  const switchPlan = async (subscription_id, stripe_price_id) => {
    // https://stripe.com/docs/billing/subscriptions/upgrade-downgrade
    //await checkAuth(user);
    //setLoading(true);
    const response = await axios.post("/api/switch-plan", {
      subscription_id,
      customer,
      return_url: `${window.location.origin}/dashboard`,
    });
    window.location.href = response.data.url;
    /*.then((subscriptionRes) => {
        //console.log("subscription is: ", subscriptionRes.data.plan);
        //console.log("stripe_price_id is: ", stripe_price_id);
        updateSubscription(subscriptionRes.data.plan, stripe_price_id);
      });*/
    //setSubscription(null); // reverting back to commented code; not needed
    //await checkAuth(user);
    //setLoading(false);
    //window.location.reload(true); // workaround for screen refresh
    //await checkAuth(user); // no need to router.push('/dashboard') anymore.
  };

  const deleteSubscription = async (stripe_subscription_id) => {
    console.log(
      "in deleteSubscription(), stripe_subscription_id is: ",
      stripe_subscription_id
    );
    let deletedSubscription = await supabase
      .from("subscriptions")
      .delete()
      .eq("stripe_subscription_id", stripe_subscription_id);
    console.log("deletedSubscription in the works: ", deletedSubscription);
    if (deletedSubscription.error) {
      console.log("Cannot delete subscription");
      console.log(deletedSubscription.error);
    }
    if (deletedSubscription.data) {
      console.log("Subscription deletion success");
      console.log(deletedSubscription.data);
    }
  };

  const cancelPlan = async (subscription_id) => {
    // https://stripe.com/docs/billing/subscriptions/cancel
    await checkAuth(user);
    setLoading(true);
    //perform the cancellation of plan. For now, when cancelling, delete the whole subscription record to test things
    await axios
      .post("/api/cancel-plan", { subscription_id })
      .then((subscriptionRes) => {
        //console.log("subscriptionRes to delete is: ", subscriptionRes.data.id);
        deleteSubscription(subscriptionRes.data.id);
      });
    //setSubscriptionInfo(null);
    await checkAuth(user);
    setLoading(false);
    //window.location.reload(true);
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
        {Object.entries(products.data || {}).map(([productId, productData]) => {
          console.log(productData, subscriptionInfo);
          const isCurrentPlan = productData?.product_name
            ?.toLowerCase()
            .includes(subscriptionInfo?.stripe_product_name);
          return (
            <div className="plans" key={productId}>
              <div>
                {productData.product_name} - {productData.description}
              </div>
              <button
                className={isCurrentPlan && "subscribed" ? "subscribed" : null}
                disabled={isCurrentPlan}
                onClick={() =>
                  subscriptionInfo?.stripe_product_name
                    ? isCurrentPlan
                      ? undefined
                      : switchPlan(
                          subscriptionInfo.stripe_subscription_id,
                          productData.prices[0].stripe_price_id
                        )
                    : checkOut(productData.prices[0].stripe_price_id)
                }
              >
                {subscriptionInfo?.stripe_product_name
                  ? isCurrentPlan
                    ? "Subscribed"
                    : "Switch Plan"
                  : "Buy Plan"}
              </button>
              {isCurrentPlan && (
                <button
                  onClick={() =>
                    cancelPlan(subscriptionInfo.stripe_subscription_id)
                  }
                >
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
