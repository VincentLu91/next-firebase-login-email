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
      subscription_data: {
        trial_settings: {
          end_behavior: {
            missing_payment_method: "pause",
          },
        },
        trial_period_days: 15, //15 is usualy recommended but experiment if needed
      },
      payment_method_collection: "if_required",
      metadata: {
        supabaseUUID: user_id,
      },
    };

    // Use customer ID for existing customers, email for new ones
    if (stripe_customer_id) {
      payload.customer = stripe_customer_id;
    } else {
      payload.customer_email = user_email;
    }
    const response = await stripe.checkout.sessions.create(payload);
    console.log("response", response);
    res.json(response);
  } catch (error) {
    console.error("Checkout session error:", error);
    res.status(500).json({
      message: error.message || "Failed to create checkout session",
    });
  }
}
