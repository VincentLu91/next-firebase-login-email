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
      client_reference_id: user_id, // Add Supabase user ID for webhook
      customer_email: user_email, // Add user email for new customers
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      metadata: {
        supabaseUUID: user_id, // Add user ID to metadata for customer linking
      },
    };

    // Only use existing customer if provided
    if (stripe_customer_id) {
      payload.customer = stripe_customer_id;
    }
    const response = await stripe.checkout.sessions.create(payload);
    console.log("response", response);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error });
  }
}
