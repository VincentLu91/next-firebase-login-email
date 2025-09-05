import Stripe from "stripe";
import { buffer } from "micro";
import {
  createOrRetrieveCustomer,
  manageSubscriptionStatusChange,
} from "../../../utils/useDatabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: false,
  },
};

const relevantEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",
]);

export default async function handler(req, res) {
  if (req.method === "POST") {
    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
      console.log("✅ Webhook received:", event.type);
    } catch (err) {
      console.log(`❌ Error message: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    if (relevantEvents.has(event.type)) {
      try {
        switch (event.type) {
          case "customer.subscription.created":
          case "customer.subscription.updated":
          case "customer.subscription.deleted": {
            const subscription = event.data.object;
            await manageSubscriptionStatusChange(
              subscription.id,
              subscription.customer,
              event.type === "customer.subscription.created"
            );
            break;
          }
          case "checkout.session.completed": {
            const checkoutSession = event.data.object;
            if (checkoutSession.mode === "subscription") {
              const subscriptionId = checkoutSession.subscription;
              await manageSubscriptionStatusChange(
                subscriptionId,
                checkoutSession.customer,
                true
              );
            }
            break;
          }
          default:
            console.log(`Unhandled relevant event type: ${event.type}`);
        }
      } catch (error) {
        console.error("Webhook handler failed:", error);
        return res.status(500).json({
          error: "Webhook handler failed",
          message: error.message,
        });
      }
    }

    res.json({ received: true });
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
}
