const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export default async function handler(req, res) {
  const {
    success_url,
    cancel_url,
    stripe_customer_id,
    price_id,
    user_id,
    user_email,
  } = req.body;
  try {
    const idemKey = `chk_${user_id || user_email}_${price_id}`;
    const payload = {
      success_url,
      cancel_url,
      client_reference_id: user_id,
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      payment_method_collection: "always", // This ensures payment method is attached to existing customer
      subscription_data: {
        trial_settings: {
          end_behavior: {
            missing_payment_method: "pause",
          },
        },
        //trial_period_days: 15 //15 days of free trial, or comment this line if no trial
      },
      metadata: {
        supabaseUUID: user_id,
      },
    };

    // Only show email in checkout, don't create customer yet
    if (user_email) {
      payload.customer_email = user_email;
    }

    const response = await stripe.checkout.sessions.create(payload, {
      idempotencyKey: idemKey,
    });
    console.log("response", response);
    res.json(response);
  } catch (error) {
    console.error("Checkout session error:", error);
    res.status(500).json({
      message: error.message || "Failed to create checkout session",
    });
  }
}
