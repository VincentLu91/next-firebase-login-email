// pages/account.js (B2C) — button opens the same Stripe pages as your Pricing cards

import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios"; // NEW
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";

function Button({ children, loading, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="u-pill btn-muted"
      style={{
        backgroundColor: "transparent",
        borderColor: "var(--muted-600)",
        borderRadius: "50px",
        padding: "8px 24px",
        fontFamily: "var(--font-family)",
      }}
    >
      <span style={{ color: "var(--text-300)" }}>
        {loading ? "Loading..." : children}
      </span>
    </button>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="animate-pulse">•</span>
      <span className="animate-pulse delay-150">•</span>
      <span className="animate-pulse delay-300">•</span>
    </span>
  );
}

function Card({ title, description, footer, children }) {
  return (
    <div className="border border-accents-1 max-w-3xl w-full rounded-lg m-auto my-8 overflow-hidden">
      <div className="px-5 py-4">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        {description && (
          <p className="text-base text-white/80">{description}</p>
        )}
        {children}
      </div>
      <div className="border-t border-accents-1 bg-red-100-2 p-4 text-blue-300 rounded-b-lg">
        {footer}
      </div>
    </div>
  );
}

export default function Account() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();

  const [loading, setLoading] = useState(false);
  const [loadingMe, setLoadingMe] = useState(true);

  const [customer, setCustomer] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [priceRow, setPriceRow] = useState(null);

  // NEW: products for fallback price when user has no subscription
  const [products, setProducts] = useState([]);

  // redirect if not signed in
  useEffect(() => {
    if (user === null) router.replace("/signin");
  }, [user, router]);

  // Load products (active) like your Pricing page
  const getProductsDisplay = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*, prices(*)")
      .eq("active", true);
    if (!error) setProducts(data || []);
  }, [supabase]);
  useEffect(() => {
    getProductsDisplay();
  }, [getProductsDisplay]);

  // Load customer + subscription + price
  const fetchMe = useCallback(
    async (u) => {
      if (!u) {
        setLoadingMe(false);
        return;
      }
      try {
        const { data: custData } = await supabase
          .from("customers")
          .select("*")
          .eq("email_address", u.email)
          .maybeSingle();

        setCustomer(custData || null);

        if (!custData) {
          setSubscription(null);
          setPriceRow(null);
          setLoadingMe(false);
          return;
        }

        const { data: subsData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("customer_id", custData.id)
          .order("created", { ascending: false })
          .limit(1);

        const sub = subsData?.[0] || null;
        setSubscription(sub);

        if (sub?.stripe_price_id) {
          const { data: priceData } = await supabase
            .from("prices")
            .select("*")
            .eq("stripe_price_id", sub.stripe_price_id)
            .maybeSingle();
          setPriceRow(priceData || null);
        } else {
          setPriceRow(null);
        }
      } catch (e) {
        console.error("account load error:", e);
      } finally {
        setLoadingMe(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    fetchMe(user);
  }, [user, fetchMe]);

  // Derived display
  const subscriptionName = subscription?.stripe_product_name || null;
  const subscriptionPrice = useMemo(() => {
    if (!priceRow?.unit_amount || !priceRow?.currency) return null;
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: (priceRow.currency || "usd").toUpperCase(),
        minimumFractionDigits: 0,
      }).format(priceRow.unit_amount / 100);
    } catch {
      return `$${(priceRow.unit_amount / 100).toFixed(0)}`;
    }
  }, [priceRow]);
  const interval = priceRow?.interval || "month";

  // --- Stripe actions copied from your Pricing page ---

  const switchPlan = async (subscription_id, stripe_price_id) => {
    setLoading(true);
    try {
      const response = await axios.post("/api/switch-plan", {
        subscription_id,
        customer,
        return_url: `${window.location.origin}/dashboard`,
      });
      window.location.href = response.data.url;
    } catch (error) {
      console.error("Error switching plan:", error);
      setLoading(false);
    }
  };

  const checkOut = async (priceId) => {
    setLoading(true);
    if (!user) {
      router.push("/signin");
      return;
    }
    try {
      const response = await axios.post("/api/checkout_session", {
        success_url: `${window.location.origin}/subscription-checkout`,
        cancel_url: window.location.href,
        stripe_customer_id: customer?.stripe_customer_id,
        price_id: priceId,
        user_id: user.id,
      });
      window.location.href = response.data.url;
    } catch (error) {
      console.error("Error during checkout:", error);
      setLoading(false);
    }
  };

  // Helper: pick a fallback price id if no subscription
  const firstActivePriceId =
    priceRow?.stripe_price_id ||
    products?.[0]?.prices?.[0]?.stripe_price_id ||
    null;

  // NEW: Replace portal behavior with same Stripe redirect as cards
  const handleStripeClick = () => {
    if (!user) {
      router.push("/signin");
      return;
    }
    // If subscription exists, use switchPlan for "Manage/Switch Plan" button
    if (subscription?.stripe_subscription_id) {
      return switchPlan(
        subscription.stripe_subscription_id,
        priceRow?.stripe_price_id
      );
    }
    // If no subscription, go to pricing page for "Subscribe" button
    router.push("/pricing");
  };

  return (
    <section
      className="bg-[#0C0C0C] mb-32 min-h-screen"
      style={{ fontFamily: "var(--font-family)" }}
    >
      <div className="max-w-6xl mx-auto pt-8 sm:pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h1 className="text-3xl font-semibold text-white mb-4">Account</h1>
          <p className="text-lg text-white/80 mb-8">
            We partnered with Stripe for a simplified billing.
          </p>
        </div>
      </div>

      <div className="p-4">
        <Card
          title="Your Plan"
          description={
            subscriptionName &&
            `You are currently on the ${subscriptionName} plan.`
          }
          footer={
            <div className="flex items-start justify-between flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-base text-white/80">
                Manage or change your plan on Stripe.
              </p>
              <p className="text-base text-white/80">
                Go to your <Link href="/dashboard">dashboard</Link>.
              </p>
              <Button
                variant="slim"
                loading={loading}
                disabled={loading}
                onClick={handleStripeClick} // 👈 now mirrors Pricing page behavior
              >
                {subscription ? "Manage / Switch Plan" : "Subscribe"}
              </Button>
            </div>
          }
        >
          <div className="text-lg mt-6 mb-4 text-white/80">
            {loadingMe ? (
              <div className="h-12 mb-6 flex items-center">
                <LoadingDots />
              </div>
            ) : subscription && subscriptionPrice ? (
              `${subscriptionPrice}/${interval}`
            ) : (
              <Link href="/pricing">Choose your plan</Link>
            )}
          </div>
        </Card>

        <Card
          title="Your Email"
          description="Please enter the email address you want to use to login."
          footer={
            <p className="text-white">
              We will email you to verify the change.
            </p>
          }
        >
          <p className="text-lg mt-6 mb-4 text-white/80">{user?.email ?? ""}</p>
        </Card>
      </div>
    </section>
  );
}
