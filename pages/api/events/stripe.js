import getRawBody from "raw-body";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});
import { supabase } from "../../../utils/initSupabase";

// https://nextjs.org/docs/api-routes/request-helpers#custom-config
export const config = {
  api: {
    bodyParser: false,
  },
};
// current ngrok link: http://fef8-142-114-125-127.ngrok.io
// note that the ngrok link once disconnected, the webhook listening will not work
// change it each time in order for webhook events to be read i.e., updating/canceling etc.

export default async function handler(req, res) {
  // This is your Stripe CLI webhook secret for testing your endpoint locally.
  // the code below mainly is copied/pasted from the code snippet generated when I created the webhook.
  //dev
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  // production
  //const endpointSecret = "whsec_84sztzV0jVbkcCZcSZmWGLYW1TjO15pH";

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
    case "customer.subscription.created":
    case "customer.subscription.updated":
      console.log("event.type is: ", event.type);
      console.log("event.data.object is: ", event.data.object);
      const customerResponse = await supabase
        .from("customers")
        .select("*")
        .eq("stripe_customer_id", event.data.object.customer);
      const customer_id = customerResponse.data[0].id;
      console.log("customerResponse is: ", customerResponse);
      console.log("customer_id is: ", customer_id);
      const subscriptionObj = event.data.object.id;
      console.log("subscriptionObj is: ", subscriptionObj);
      const stripe_price_id = event.data.object.plan.id;
      console.log("stripe_price_id is: ", stripe_price_id);
      let priceResponse = await supabase
        .from("prices")
        .select("*")
        .eq("stripe_price_id", stripe_price_id);
      console.log("priceResponse when switching plans is: ", priceResponse);
      let productResponse = await supabase
        .from("products")
        .select("*")
        .eq("stripe_product_id", priceResponse.data[0].stripe_product_id);
      console.log("productResponse when switching plans is: ", productResponse);
      // renewing tokens
      let customerTokenUpdate = {
        id: customer_id,
        mic_tokens: priceResponse.data[0].mic_tokens,
        call_tokens: priceResponse.data[0].call_tokens,
        num_calls: priceResponse.data[0].num_calls,
      };
      await supabase
        .from("customers")
        .upsert(customerTokenUpdate)
        .select()
        .eq("stripe_customer_id", event.data.object.customer);
      let subscriptionUpdateResponse = await supabase
        .from("subscriptions")
        .update([
          {
            //stripe_subscription_id: res.data.subscription, // subscription id is the same no matter the product
            stripe_price_id: priceResponse.data[0].stripe_price_id,
            stripe_product_id: productResponse.data[0].stripe_product_id,
            price_id: priceResponse.data[0].id,
            cancel_at_period_end: event.data.object.cancel_at_period_end,
            product_id: productResponse.data[0].id,
            stripe_product_name: productResponse.data[0].product_name,
            //cancel_at_period_end: false,
          },
        ])
        .eq("customer_id", customer_id)
        .select();
      console.log(
        "subscriptionUpdateResponse is: ",
        subscriptionUpdateResponse
      );
      // ... handle other event types
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).json({});
}
