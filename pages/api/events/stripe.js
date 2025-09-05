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
]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  let event;
  try {
    const rawBody = await buffer(req);
    const signature = req.headers["stripe-signature"];

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error(`⚠️ Webhook signature verification failed:`, err.message);
      return res.status(400).json({
        error: `Webhook Error: ${err.message}`,
      });
    }

    console.log(`✅ Received webhook: ${event.type}`);

    if (relevantEvents.has(event.type)) {
      try {
        switch (event.type) {
          case "customer.subscription.created":
          case "customer.subscription.updated": {
            const subscription = event.data.object;
            await manageSubscriptionStatusChange(
              subscription.id,
              subscription.customer,
              event.type === "customer.subscription.created"
            );
            break;
          }
          case "customer.subscription.deleted": {
            const subscription = event.data.object;
            // For deleted subscriptions, set cancel_at to now if not already set
            const cancelAt =
              subscription.cancel_at || Math.floor(Date.now() / 1000);
            await manageSubscriptionStatusChange(
              subscription.id,
              subscription.customer,
              false,
              cancelAt
            );
            break;
          }
          case "checkout.session.completed": {
            const checkoutSession = event.data.object;
            if (checkoutSession.mode === "subscription") {
              await manageSubscriptionStatusChange(
                checkoutSession.subscription,
                checkoutSession.customer,
                true
              );
            }
            break;
          }
        }
      } catch (error) {
        console.error(`Error handling ${event.type}:`, error);
        return res.status(500).json({
          error: "Webhook handler failed",
          message: error.message,
          type: event.type,
        });
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}
