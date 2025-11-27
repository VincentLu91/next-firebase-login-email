import axios from "axios";
import { useRouter } from "next/router";
import React, { useEffect, useState, useCallback } from "react";
import { useUser, useSupabaseClient } from "../utils/supabase-hooks";
import e from "cors";

const SubscriptionCheckout = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState(null);
  const user = useUser();
  const supabase = useSupabaseClient();

  const { session_id } = router.query;

  const checkAuth = useCallback(
    async (user, res, stripe_price) => {
      console.log("Price is: ", stripe_price);
      if (user) {
        console.log("Supabase user is: ", user);
        let customerInfo = await supabase
          .from("customers")
          .select("*")
          .eq("email_address", user.email);
        console.log("customerInfo is: ", customerInfo.data[0]);
        console.log("session_id is: ", session_id);
        if (customerInfo.data[0]) {
          console.log("res is: ", res);
          customerInfo = await supabase
            .from("customers")
            .update([{ stripe_customer_id: res.data.customer }])
            .eq("email_address", user.email)
            .select();
          if (customerInfo.error) {
            console.log("Cannot update customer, see error: ");
            console.log(customerInfo.error);
          }
          if (customerInfo.data) {
            console.log("Customer Update Success!");
            console.log(
              "Customer Info Data is >>>>>>>",
              customerInfo.data[0].id
            );
            // now, set up subscription record for new customer
            let subscriptionResponse = await supabase
              .from("subscriptions")
              .select("*")
              .eq("customer_id", customerInfo.data[0].id);
            console.log(
              "subscriptionResponse length is: ",
              subscriptionResponse.data.length
            );
            if (subscriptionResponse.data.length == 0) {
              // get price info from prices table
              let priceResponse = await supabase
                .from("prices")
                .select("*")
                .eq("stripe_price_id", stripe_price.id);
              console.log("priceResponse is: ", priceResponse);
              // get product info from products table
              let productResponse = await supabase
                .from("products")
                .select("*")
                .eq("stripe_product_id", stripe_price.product);
              console.log("productResponse is: ", productResponse);
              subscriptionResponse = await supabase
                .from("subscriptions")
                .insert([
                  {
                    customer_id: customerInfo.data[0].id,
                    stripe_subscription_id: res.data.subscription,
                    stripe_price_id: stripe_price.id,
                    stripe_product_id: stripe_price.product,
                    price_id: priceResponse.data[0].id,
                    product_id: productResponse.data[0].id,
                    stripe_product_name: productResponse.data[0].product_name,
                    //cancel_at_period_end: false,
                  },
                ])
                .select()
                .eq("customer_id", customerInfo.data[0].id);
            } else {
              console.log("subscriptionResponse is already created");
            }
          }
        } else {
          //console.log("customerInfo is: ", customerInfo.data[0]); //customerInfo.data[0].id
          console.log("Something wrong ");
        }
      } else {
        // User is signed out
        console.log(
          "The user is inauthenticated, redirecting back to signin page"
        );
        router.push("/signin");
      }
    },
    [router, supabase, session_id]
  );

  useEffect(() => {
    if (session_id) {
      axios.post("/api/complete_checkout", { session_id }).then((res) => {
        console.log("res", res);
        axios
          .post("/api/retrieve-stripe-invoice", {
            invoice_id: res.data.invoice,
          })
          .then((invoice_res) =>
            checkAuth(user, res, invoice_res.data.lines.data[0].price)
          )
          .catch((err) => console.error("Error is: ", err));
        // add stripe customer id to supabase customer record
        //checkAuth(user, res);
        router.push("/dashboard");
      });
    }
  }, [session_id, router, supabase, user, checkAuth, response]);

  return <div>{loading ? "Wrapping up your subscription" : null}</div>;
};

export default SubscriptionCheckout;
