import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { loadStripe } from "@stripe/stripe-js";
import axios from "axios";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import ToggleSwitch from "../components/controls/ToggleSwitch";

const Pricing = () => {
  const [billingInterval, setBillingInterval] = useState("month");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [customer, setCustomer] = useState(null);
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();

  const getProductsDisplay = useCallback(async () => {
    let productsData = await supabase
      .from("products")
      .select("*, prices(*)")
      .eq("active", true);
    console.log("Products are: ", productsData);
    setProducts(productsData.data || []);
  }, [supabase]);

  useEffect(() => {
    getProductsDisplay();
  }, [getProductsDisplay]);

  useEffect(() => {
    const checkAuth = async () => {
      if (user) {
        let customerInfo = await supabase
          .from("customers")
          .select("*")
          .eq("email_address", user.email);
        setCustomer(customerInfo.data?.[0]);
      }
    };
    checkAuth();
  }, [user, supabase]);

  const checkOut = async (priceId) => {
    setLoading(true);
    if (!user) {
      router.push("/signin");
      return;
    }

    try {
      const stripe = await loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      );
      const response = await axios.post("/api/checkout_session", {
        success_url: `${window.location.origin}/subscription-checkout`,
        cancel_url: window.location.href,
        stripe_customer_id: customer?.stripe_customer_id,
        price_id: priceId,
      });
      window.location.href = response.data.url;
    } catch (error) {
      console.error("Error during checkout:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!products.length) {
    return (
      <section className="bg-black relative">
        <div className="max-w-[1000px] mx-auto py-8 sm:py-24 px-4 sm:px-6 lg:px-8">
          <p className="text-4xl font-bold text-white text-center">
            No subscription pricing plans found.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-black">
      <div className="max-w-[1200px] mx-auto px-6 py-20">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white sm:text-center">
            Choose Your Plan
          </h1>

          <ToggleSwitch value={billingInterval} onChange={setBillingInterval} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(300px, 1fr))",
            gap: "0",
            width: "100%",
            maxWidth: "1200px",
            margin: "40px auto 0",
          }}
        >
          {products.map((product) => {
            const price = product.prices?.[0];
            if (!price) return null;

            const priceString = new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: price.currency || "USD",
              minimumFractionDigits: 0,
            }).format((price.unit_amount || 0) / 100);

            return (
              <div key={product.id} className="bg-gray-800 p-8">
                <div>
                  <h2 className="text-xl leading-6 font-semibold text-white">
                    {product.product_name}
                  </h2>
                  <p className="mt-2 text-gray-300">{product.description}</p>
                  <div className="mt-8 mb-8">
                    <span className="text-4xl font-bold text-white">
                      {priceString}
                    </span>
                    <span className="text-base font-medium text-gray-300">
                      /{billingInterval}
                    </span>
                  </div>

                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg
                          className="w-4 h-4 text-green-500 flex-none"
                          height="16"
                          width="16"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <p className="ml-3 text-base text-gray-300">
                        {price.mic_tokens} Microphone Minutes
                      </p>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg
                          className="w-4 h-4 text-green-500 flex-none"
                          height="16"
                          width="16"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <p className="ml-3 text-base text-gray-300">
                        {price.call_tokens} Call Minutes
                      </p>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg
                          className="w-4 h-4 text-green-500 flex-none"
                          height="16"
                          width="16"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <p className="ml-3 text-base text-gray-300">
                        {price.num_calls} Number of Calls
                      </p>
                    </li>
                  </ul>

                  <button
                    onClick={() => checkOut(price.stripe_price_id)}
                    disabled={loading}
                    className="block w-full bg-purple-600 border border-transparent rounded-lg py-3 text-sm font-semibold text-white text-center hover:bg-purple-700"
                  >
                    {loading ? "Loading..." : "Subscribe"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
