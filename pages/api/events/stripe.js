import getRawBody from "raw-body";
const stripe = require("stripe")(
  "sk_test_51Jx1cdLBlaDAR7THINnFtmhlbxt3oaeehIMdTtpTitqJtX5eTtBenCXEF1bnHUN8xvpzUSAxgFhut1BfRu1bZljo00F6QMtxgc"
);
import { supabase } from "../../../utils/initSupabase";

// https://nextjs.org/docs/api-routes/request-helpers#custom-config
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // This is your Stripe CLI webhook secret for testing your endpoint locally.
  // the code below mainly is copied/pasted from the code snippet generated when I created the webhook.
  const endpointSecret = "whsec_84sztzV0jVbkcCZcSZmWGLYW1TjO15pH";

  const sig = req.headers["stripe-signature"];

  let event;

  try {
    const buf = await getRawBody(req); // because in Next.js, req.body doesn't give us the raw body...
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
  } catch (err) {
    console.log(err);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  console.log("event", event);

  // Handle the event
  switch (event.type) {
    case "customer.subscription.deleted":
      const stripeSubscription = event.data.object;
      const data = await supabase
        .from("subscriptions")
        .delete()
        .eq("stripe_subscription_id", stripeSubscription.id);

      console.log("subscription", data);
      // grab customer data from object
      // query supabase for customer
      // and delete customer subscription
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).json({});
}
