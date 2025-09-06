import Stripe from "stripe";
import { buffer } from "micro";
import {
  createOrRetrieveCustomer,
  createSubscription,
  manageSubscriptionStatusChange,
} from "../../../utils/useDatabase";
import { supabase } from "../../../utils/initSupabase";

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

              // Then handle the subscription, passing the user ID
              await manageSubscriptionStatusChange(
                checkoutSession.subscription,
                checkoutSession.customer,
                checkoutSession.client_reference_id,
                true
              );
            }
            break;
          }
          case "customer.subscription.created": {
            const subscription = event.data.object;
            console.log("subscription is: ", subscription);

            try {
              // First ensure we have a customer record
              const stripeCustomer = await stripe.customers.retrieve(
                subscription.customer
              );
              console.log("Retrieved Stripe customer:", stripeCustomer);

              // Try to find an existing customer row by stripe_customer_id
              let { data: customerRow } = await supabase
                .from("customers")
                .select("id, stripe_customer_id")
                .eq("stripe_customer_id", subscription.customer)
                .single();

              if (!customerRow) {
                // Try to find by email if available
                if (stripeCustomer.email) {
                  const { data } = await supabase
                    .from("customers")
                    .select("id")
                    .eq("email_address", stripeCustomer.email)
                    .single();

                  if (data) {
                    // Update existing customer with stripe_customer_id
                    const { data: updated, error } = await supabase
                      .from("customers")
                      .update({ stripe_customer_id: subscription.customer })
                      .eq("id", data.id)
                      .select()
                      .single();

                    if (error) throw error;
                    customerRow = updated;
                    console.log(
                      "Updated customer with Stripe ID:",
                      customerRow
                    );
                  }
                }
              }

              // If still no customer row, create one
              if (!customerRow) {
                // Generate a UUID for new customer
                const newCustomerId = crypto.randomUUID();
                const { data: created, error } = await supabase
                  .from("customers")
                  .insert({
                    id: newCustomerId,
                    stripe_customer_id: subscription.customer,
                    email_address: stripeCustomer.email,
                    mic_tokens: 0,
                    call_tokens: 0,
                    num_calls: 0,
                  })
                  .select()
                  .single();

                if (error) throw error;
                customerRow = created;
                console.log("Created new customer:", customerRow);
              }

              // Now create the subscription
              await createSubscription(subscription.id, subscription.customer);
            } catch (error) {
              console.error("Error handling subscription creation:", error);
              throw error;
            }
            break;
          }

          case "customer.subscription.updated": {
            const subscription = event.data.object;
            // Get the user ID from metadata
            const stripeCustomer = await stripe.customers.retrieve(
              subscription.customer
            );
            const userId = stripeCustomer.metadata.supabaseUUID;

            if (!userId) {
              console.log("No user ID found in customer metadata");
              return res.json({ received: true });
            }

            await manageSubscriptionStatusChange(
              subscription.id,
              subscription.customer,
              userId,
              false
            );
            break;
          }
          case "customer.subscription.deleted": {
            const subscription = event.data.object;
            // For deleted subscriptions, set cancel_at to now if not already set
            const cancelAt =
              subscription.cancel_at || Math.floor(Date.now() / 1000);
            // Get the user ID from metadata
            const stripeCustomer = await stripe.customers.retrieve(
              subscription.customer
            );
            const userId = stripeCustomer.metadata.supabaseUUID;

            if (!userId) {
              console.log("No user ID found in customer metadata");
              return res.json({ received: true });
            }

            await manageSubscriptionStatusChange(
              subscription.id,
              subscription.customer,
              userId,
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
