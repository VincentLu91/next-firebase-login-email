const stripe = require("stripe")(
  "sk_test_51Jx1cdLBlaDAR7THINnFtmhlbxt3oaeehIMdTtpTitqJtX5eTtBenCXEF1bnHUN8xvpzUSAxgFhut1BfRu1bZljo00F6QMtxgc"
);

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
