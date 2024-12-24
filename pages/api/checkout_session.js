const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export default async function handler(req, res) {
  const { success_url, cancel_url, stripe_customer_id, price_id } = req.body;
  try {
    const payload = {
      // https://stripe.com/docs/payments/checkout/custom-success-page
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
      line_items: [
        {
          // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
          price: price_id,
          quantity: 1,
        },
      ],
      mode: "subscription",
    };
    if (stripe_customer_id) payload.customer = stripe_customer_id;
    const response = await stripe.checkout.sessions.create(payload);
    console.log("response", response);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error });
  }
}
