import Stripe from "stripe";
import { buffer } from "micro";
import {
  // createOrRetrieveCustomer, // ❌ not used anymore
  // createSubscription,       // (still unused here, keep if you need elsewhere)
  manageSubscriptionStatusChange,
  deleteSubscription,
  upsertProductRecord,
  upsertPriceRecord,
} from "../../../utils/useDatabase";
import { supabase } from "../../../utils/initSupabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = { api: { bodyParser: false } };

const relevantEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "product.created",
  "product.updated",
  "price.created",
  "price.updated",
]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const rawBody = await buffer(req);
    const signature = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error("⚠️ Webhook signature verification failed:", err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    console.log(`✅ Received webhook: ${event.type}`);

    if (!relevantEvents.has(event.type)) {
      return res.json({ received: true });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const s = event.data.object;
          console.log("Checkout completed:", {
            mode: s.mode,
            customer: s.customer,
            subscription: s.subscription,
            clientRef: s.client_reference_id,
            customerEmail: s.customer_details?.email,
          });

          if (s.mode === "subscription") {
            const userId = s.client_reference_id;
            const stripeCustomerId = s.customer;

            const { data: existing } = await supabase
              .from("customers")
              .select("stripe_customer_id, email_address")
              .eq("id", userId)
              .single();

            if (
              !existing?.stripe_customer_id ||
              existing.stripe_customer_id === stripeCustomerId
            ) {
              await supabase.from("customers").upsert({
                id: userId,
                stripe_customer_id: stripeCustomerId,
                email_address:
                  s.customer_details?.email ?? existing?.email_address ?? null,
              });
            } else {
              // Log and keep canonical to avoid flip-flopping IDs
              console.log(
                "Skip overwrite: canonical customer already set:",
                existing.stripe_customer_id
              );
            }

            await manageSubscriptionStatusChange(
              s.subscription,
              stripeCustomerId,
              userId,
              true
            );
          }
          break;
        }

        case "customer.subscription.created": {
          const subscription = event.data.object;

          // Prefer binding via checkout.session.completed; avoid creating random local users
          const stripeCustomer = await stripe.customers.retrieve(
            subscription.customer
          );

          // Try to find an existing local customer by stripe_customer_id
          let { data: customerRow } = await supabase
            .from("customers")
            .select("id, stripe_customer_id")
            .eq("stripe_customer_id", subscription.customer)
            .single();

          // Fallback: try by email and attach stripe_customer_id
          if (!customerRow && stripeCustomer.email) {
            const { data: byEmail } = await supabase
              .from("customers")
              .select("id")
              .eq("email_address", stripeCustomer.email)
              .single();

            if (byEmail) {
              const { data: updated, error } = await supabase
                .from("customers")
                .update({ stripe_customer_id: subscription.customer })
                .eq("id", byEmail.id)
                .select()
                .single();
              if (error) throw error;
              customerRow = updated;
            }
          }

          // If we still don't have a local row, no-op.
          if (!customerRow) {
            console.log(
              "No local customer yet; checkout.session.completed will upsert shortly."
            );
            break;
          }

          await manageSubscriptionStatusChange(
            subscription.id,
            subscription.customer,
            customerRow.id,
            true
          );
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object;
          // Resolve userId from local DB using email (best-effort)
          const stripeCustomer = await stripe.customers.retrieve(
            subscription.customer
          );

          let userId = null;
          if (stripeCustomer.email) {
            const { data } = await supabase
              .from("customers")
              .select("id")
              .eq("email_address", stripeCustomer.email)
              .single();
            if (data) userId = data.id;
          }

          if (!userId) {
            console.log("No user ID found; skipping update sync.");
            return res.json({ received: true });
          }

          // Ensure subscription exists locally; if not, let completed handler create it.
          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("stripe_subscription_id", subscription.id)
            .single();

          if (!existingSub) {
            console.log("No existing subscription found for update; skipping.");
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

          const stripeCustomer = await stripe.customers.retrieve(
            subscription.customer
          );

          let userId = null;
          if (stripeCustomer.email) {
            const { data } = await supabase
              .from("customers")
              .select("id")
              .eq("email_address", stripeCustomer.email)
              .single();
            if (data) userId = data.id;
          }

          if (!userId) {
            console.log("No user ID found for deleted subscription; skipping.");
            return res.json({ received: true });
          }

          await deleteSubscription(userId);
          break;
        }

        case "product.created":
        case "product.updated":
          await upsertProductRecord(event.data.object);
          break;

        case "price.created":
        case "price.updated":
          await upsertPriceRecord(event.data.object);
          break;
      }

      return res.json({ received: true });
    } catch (error) {
      console.error(`Error handling ${event.type}:`, error);
      return res.status(500).json({
        error: "Webhook handler failed",
        message: error.message,
        type: event.type,
      });
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}
