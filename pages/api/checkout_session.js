// pages/api/checkout_session.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});
const { supabase } = require("../../utils/initSupabase");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const { success_url, cancel_url, price_id, user_id, user_email } = req.body;

  try {
    // 1) Resolve or create the ONE Stripe customer for this user (server-side only)
    let stripeCustomerId = null;

    // a) Check our DB
    const { data: row } = await supabase
      .from("customers")
      .select("stripe_customer_id, email_address")
      .eq("id", user_id)
      .single();

    if (row?.stripe_customer_id) {
      stripeCustomerId = row.stripe_customer_id;
    } else {
      // b) Try to find an existing Stripe customer by email (covers prior runs)
      let foundId = null;
      if (user_email) {
        const search = await stripe.customers.search({
          query: `email:"${user_email}"`,
        });
        foundId = search.data?.[0]?.id || null;
      }

      // c) Create if not found
      if (!foundId) {
        const created = await stripe.customers.create({
          email: user_email || undefined,
          metadata: { supabaseUUID: user_id },
        });
        foundId = created.id;
      }

      // d) Persist canonical ID
      await supabase.from("customers").upsert({
        id: user_id,
        email_address: user_email ?? row?.email_address ?? null,
        stripe_customer_id: foundId,
      });

      stripeCustomerId = foundId;
    }

    // 2) Build Checkout payload with *customer only* (never customer_email)
    const payload = {
      success_url,
      cancel_url,
      client_reference_id: user_id,
      line_items: [{ price: price_id, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      payment_method_collection: "always",
      subscription_data: {
        trial_settings: { end_behavior: { missing_payment_method: "pause" } },
      },
      customer: stripeCustomerId,
      metadata: { supabaseUUID: user_id },
    };

    // 3) Idempotency key (include that we always pass 'cust')
    const idemKey = `chk_sub_cust_${user_id}_${price_id}_v1`;

    const session = await stripe.checkout.sessions.create(payload, {
      idempotencyKey: idemKey,
    });

    return res.json(session);
  } catch (error) {
    console.error("Checkout session error:", error);
    return res
      .status(500)
      .json({ message: error.message || "Failed to create checkout session" });
  }
}
