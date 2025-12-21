// pages/api/buy-credits-checkout.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});
const { supabase } = require("../../utils/initSupabase");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const {
    success_url,
    cancel_url,
    price_id,
    user_id,
    user_email,
    token_type,
    token_amount,
  } = req.body;

  try {
    // 1) Resolve or create the Stripe customer
    let stripeCustomerId = null;

    const { data: row } = await supabase
      .from("customers")
      .select("stripe_customer_id, email_address")
      .eq("id", user_id)
      .single();

    if (row?.stripe_customer_id) {
      stripeCustomerId = row.stripe_customer_id;
    } else {
      // Try to find an existing Stripe customer by email
      let foundId = null;
      if (user_email) {
        const search = await stripe.customers.search({
          query: `email:"${user_email}"`,
        });
        foundId = search.data?.[0]?.id || null;
      }

      // Create if not found
      if (!foundId) {
        const created = await stripe.customers.create({
          email: user_email || undefined,
          metadata: { supabaseUUID: user_id },
        });
        foundId = created.id;
      }

      // Persist canonical ID
      await supabase.from("customers").upsert({
        id: user_id,
        email_address: user_email ?? row?.email_address ?? null,
        stripe_customer_id: foundId,
      });

      stripeCustomerId = foundId;
    }

    // 2) Build Checkout payload for one-time payment
    const payload = {
      success_url,
      cancel_url,
      client_reference_id: user_id,
      line_items: [{ price: price_id, quantity: 1 }],
      mode: "payment", // One-time payment, not subscription
      allow_promotion_codes: true,
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      customer: stripeCustomerId,
      metadata: {
        supabaseUUID: user_id,
        token_type: token_type, // 'mic_tokens' or 'call_tokens'
        token_amount: token_amount.toString(), // Amount of tokens to add
      },
    };

    // 3) Idempotency key
    const idemKey = `chk_credits_${user_id}_${price_id}_${Date.now()}`;

    const session = await stripe.checkout.sessions.create(payload, {
      idempotencyKey: idemKey,
    });

    // COMMENTED OUT: Workaround that adds tokens immediately (uncomment if webhooks don't work)
    /*
    console.log(
      `🔧 LOCAL TEST MODE: Adding ${token_amount} ${token_type} immediately`
    );

    try {
      // Get current tokens
      const { data: currentCustomer, error: fetchError } = await supabase
        .from("customers")
        .select(`id, ${token_type}`)
        .eq("id", user_id)
        .single();

      if (!fetchError && currentCustomer) {
        const oldBalance = currentCustomer[token_type] || 0;
        const newBalance = oldBalance + parseInt(token_amount);

        // Update tokens
        const { error: updateError } = await supabase
          .from("customers")
          .update({ [token_type]: newBalance })
          .eq("id", user_id);

        if (!updateError) {
          console.log(
            `✅ Tokens added! Old: ${oldBalance}, New: ${newBalance}`
          );
        } else {
          console.error(`❌ Update error:`, updateError);
        }
      } else {
        console.error(`❌ Fetch error:`, fetchError);
      }
    } catch (err) {
      console.error(`❌ Exception adding tokens:`, err);
    }
    */

    return res.json(session);
  } catch (error) {
    console.error("Credit purchase checkout error:", error);
    return res.status(500).json({
      message: error.message || "Failed to create credit purchase checkout",
    });
  }
}
