const stripe = require("stripe")(
  "sk_test_51Jx1cdLBlaDAR7THINnFtmhlbxt3oaeehIMdTtpTitqJtX5eTtBenCXEF1bnHUN8xvpzUSAxgFhut1BfRu1bZljo00F6QMtxgc"
);

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
