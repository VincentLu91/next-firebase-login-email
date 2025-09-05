import Stripe from "stripe";
import { buffer } from "micro";
import {
  createOrRetrieveCustomer,
  createSubscription,
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
          case "checkout.session.completed": {
            const checkoutSession = event.data.object;
            console.log("Checkout completed:", {
              mode: checkoutSession.mode,
              customer: checkoutSession.customer,
              subscription: checkoutSession.subscription,
              clientRef: checkoutSession.client_reference_id,
              customerEmail: checkoutSession.customer_details?.email,
            });

            if (checkoutSession.mode === "subscription") {
              // First create/setup the customer
              const stripeCustomerId = await createOrRetrieveCustomer({
                email: checkoutSession.customer_details?.email,
                uuid: checkoutSession.client_reference_id,
              });
              console.log("Customer created/retrieved:", {
                stripeId: stripeCustomerId,
                uuid: checkoutSession.client_reference_id,
              });

              // Then handle the subscription
              await manageSubscriptionStatusChange(
                checkoutSession.subscription,
                checkoutSession.customer,
                true
              );
            }
            break;
          }
          case "customer.subscription.created": {
            const subscription = event.data.object;

            // Try to find an existing customer row by stripe_customer_id
            let { data: customerRow } = await supabase
              .from("customers")
              .select("id, stripe_customer_id")
              .eq("stripe_customer_id", subscription.customer)
              .single();

            // If not found, try to patch stripe_customer_id using metadata
            if (!customerRow) {
              // The supabaseUUID should be in your Stripe metadata
              const supabaseUUID = subscription.metadata?.supabaseUUID;
              if (supabaseUUID) {
                const { data, error } = await supabase
                  .from("customers")
                  .update({ stripe_customer_id: subscription.customer })
                  .eq("id", supabaseUUID)
                  .select("id, stripe_customer_id")
                  .single();

                if (error) throw error;
                customerRow = data;
                console.log("Patched customer:", customerRow);
              }
            }

            // Now continue creating the subscription row
            if (customerRow) {
              await createSubscription(subscription.id, subscription.customer);
            } else {
              console.warn(
                `⚠️ Could not find or patch customer for subscription ${subscription.id}`
              );
            }

            break;
          }

          case "customer.subscription.updated": {
            const subscription = event.data.object;
            await manageSubscriptionStatusChange(
              subscription.id,
              subscription.customer,
              false
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
