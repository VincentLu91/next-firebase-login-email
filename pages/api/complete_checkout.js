const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export default async function handler(req, res) {
  console.log("checkout request body is: ", req.body);
  const { session_id } = req.body;
  try {
    // https://stripe.com/docs/api/checkout/sessions/retrieve?lang=node
    const session = await stripe.checkout.sessions.retrieve(session_id);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error });
  }
}
