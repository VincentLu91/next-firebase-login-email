// Set your secret key. Remember to switch to your live secret key in production.
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export default async function handler(req, res) {
  // https://stripe.com/docs/billing/subscriptions/cancel
  console.log("subscription request body is: ", req.body);
  const { subscription_id } = req.body;
  try {
    // https://stripe.com/docs/billing/subscriptions/upgrade-downgrade
    const subscription = await stripe.subscriptions.update(subscription_id, {
      cancel_at_period_end: true,
    });
    console.log("Deleted subscription is: ", subscription);
    /*let deletedSubscription = await stripe.subscriptions.del(subscription_id);
    console.log("deletedSubscription is: ", deletedSubscription);*/
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error });
  }
}
