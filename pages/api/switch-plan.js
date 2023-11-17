// Set your secret key. Remember to switch to your live secret key in production.
const stripe = require("stripe")(
  "sk_test_51Jx1cdLBlaDAR7THINnFtmhlbxt3oaeehIMdTtpTitqJtX5eTtBenCXEF1bnHUN8xvpzUSAxgFhut1BfRu1bZljo00F6QMtxgc",
  { apiVersion: "2023-10-16" }
);

export default async function handler(req, res) {
  console.log("subscription request body is: ", req.body);
  const { subscription_id, stripe_price_id } = req.body;
  try {
    // https://stripe.com/docs/billing/subscriptions/upgrade-downgrade
    console.log("subscription_id is: ", subscription_id);
    const subscription = await stripe.subscriptions.retrieve(subscription_id);
    console.log("subscription in api is: ", subscription);
    const subscriptionRes = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: false,
      proration_behavior: "create_prorations",
      items: [
        {
          id: subscription.items.data[0].id,
          price: stripe_price_id,
        },
      ],
    });
    //console.log("subscription_id is: ", subscription_id);
    //console.log("subscription_id is: ", subscription_id);
    console.log("subscriptionRes is: ", subscriptionRes);
    res.json(subscriptionRes);
  } catch (error) {
    res.status(500).json({ error });
  }
}
