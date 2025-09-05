import { supabase } from "./initSupabase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function createOrRetrieveCustomer({ email, uuid }) {
  console.log("Creating/retrieving customer for:", { email, uuid });

  const { data, error } = await supabase
    .from("customers")
    .select("stripe_customer_id")
    .eq("id", uuid)
    .single();

  if (error || !data?.stripe_customer_id) {
    console.log("No existing customer found, creating new one");

    // Create new Stripe customer
    const customerData = {
      metadata: {
        supabaseUUID: uuid,
      },
    };
    if (email) customerData.email = email;

    const customer = await stripe.customers.create(customerData);
    console.log("Created Stripe customer:", customer.id);

    // Get existing customer data if any
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("mic_tokens, call_tokens, num_calls")
      .eq("id", uuid)
      .single();

    // Update or insert customer record
    const { error: supabaseError } = await supabase.from("customers").upsert({
      id: uuid,
      stripe_customer_id: customer.id,
      // Preserve existing token values or default to 0
      mic_tokens: existingCustomer?.mic_tokens ?? 0,
      call_tokens: existingCustomer?.call_tokens ?? 0,
      num_calls: existingCustomer?.num_calls ?? 0,
    });

    if (supabaseError) throw supabaseError;

    console.log(`New customer created and inserted for ${uuid}`);
    return customer.id;
  }

  console.log("Found existing customer:", data.stripe_customer_id);
  return data.stripe_customer_id;
}

export async function manageSubscriptionStatusChange(
  subscriptionId,
  customerId,
  createAction = false
) {
  // Get customer's UUID from Stripe metadata
  const stripeCustomer = await stripe.customers.retrieve(customerId);
  const supabaseUUID = stripeCustomer.metadata.supabaseUUID;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method", "items.data.price"],
  });

  const subscriptionData = {
    id: subscription.id,
    user_id: supabaseUUID,
    status: subscription.status,
    price_id: subscription.items.data[0].price.id,
    quantity: subscription.quantity,
    cancel_at_period_end: subscription.cancel_at_period_end,
    cancel_at: subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000).toISOString()
      : null,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
    current_period_start: new Date(
      subscription.current_period_start * 1000
    ).toISOString(),
    current_period_end: new Date(
      subscription.current_period_end * 1000
    ).toISOString(),
    created: new Date(subscription.created * 1000).toISOString(),
    ended_at: subscription.ended_at
      ? new Date(subscription.ended_at * 1000).toISOString()
      : null,
    trial_start: subscription.trial_start
      ? new Date(subscription.trial_start * 1000).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
  };

  const { error } = await supabase
    .from("subscriptions")
    .upsert(subscriptionData);

  if (error) throw error;

  console.log(
    `Subscription [${subscription.id}] updated for user [${supabaseUUID}]`
  );

  // If subscription is active, update customer tokens based on plan
  if (subscription.status === "active" || subscription.status === "trialing") {
    const priceId = subscription.items.data[0].price.id;
    const { data: price } = await supabase
      .from("prices")
      .select("mic_tokens, call_tokens")
      .eq("id", priceId)
      .single();

    if (price) {
      await supabase.from("customers").upsert({
        id: supabaseUUID,
        mic_tokens: price.mic_tokens,
        call_tokens: price.call_tokens,
      });
    }
  }

  // Copy billing details to customer
  if (createAction && subscription.default_payment_method) {
    const { billing_details } = subscription.default_payment_method;
    await stripe.customers.update(customerId, {
      name: billing_details.name,
      phone: billing_details.phone,
      address: billing_details.address,
    });
  }
}

// Existing token management functions
const getTokens = async (customerId, typeOfToken) => {
  // Validate typeOfToken
  const validTokenTypes = ["mic_tokens", "call_tokens"];
  if (!validTokenTypes.includes(typeOfToken)) {
    throw new Error(`Invalid typeOfToken: ${typeOfToken}`);
  }

  const {
    data: { id: uuid, [typeOfToken]: tokens },
    error: noCustomerError,
  } = await supabase
    .from("customers")
    .select("id, " + typeOfToken)
    .eq("id", customerId)
    .single();

  if (noCustomerError) return false;

  console.log(`get${typeOfToken}: `, tokens.data);
  return tokens;
};

const getTieredTokens = async (customerId, typeOfToken) => {
  const {
    data: { price_id },
    error: noPriceDataError,
  } = await supabase
    .from("subscriptions")
    .select("price_id")
    .eq("user_id", customerId)
    .single();

  if (noPriceDataError) return false;

  console.log(`price_id: `, price_id);

  const validTokenTypes = ["mic_tokens", "call_tokens"];
  if (!validTokenTypes.includes(typeOfToken)) {
    throw new Error(`Invalid typeOfToken: ${typeOfToken}`);
  }

  const {
    data: { [typeOfToken]: tokens },
    error: noPriceError,
  } = await supabase
    .from("prices")
    .select("id, " + typeOfToken)
    .eq("id", price_id)
    .single();

  if (noPriceError) return false;

  console.log(`tiered${typeOfToken}: `, tokens.data);
  return tokens;
};

const deductUserMicToken = async (customerId, tokensToDeduct) => {
  const {
    data: { id: uuid, mic_tokens },
    error: noCustomerError,
  } = await supabase
    .from("customers")
    .select("id,mic_tokens")
    .eq("id", customerId)
    .single();
  if (noCustomerError) return false;

  if (mic_tokens - tokensToDeduct >= 0) {
    let customerTokenUpdate = {
      id: uuid,
      mic_tokens: mic_tokens - tokensToDeduct,
    };

    await supabase.from("customers").upsert(customerTokenUpdate).select();
    return true;
  } else {
    return false;
  }
};

const deductUserCallToken = async (customerId, tokensToDeduct) => {
  const {
    data: { id: uuid, call_tokens },
    error: noCustomerError,
  } = await supabase
    .from("customers")
    .select("id,call_tokens")
    .eq("id", customerId)
    .single();
  if (noCustomerError) return false;

  if (call_tokens - tokensToDeduct >= 0) {
    let customerTokenUpdate = {
      id: uuid,
      call_tokens: call_tokens - tokensToDeduct,
    };

    await supabase.from("customers").upsert(customerTokenUpdate).select();
    return true;
  } else {
    return false;
  }
};

const deductNumCallsToken = async (customerId, tokensToDeduct) => {
  const {
    data: { id: uuid, num_calls },
    error: noCustomerError,
  } = await supabase
    .from("customers")
    .select("id,num_calls")
    .eq("id", customerId)
    .single();
  if (noCustomerError) return false;

  if (num_calls - tokensToDeduct >= 0) {
    let customerTokenUpdate = {
      id: uuid,
      num_calls: num_calls - tokensToDeduct,
    };
    const data = await supabase
      .from("customers")
      .upsert(customerTokenUpdate)
      .select();
    return {
      data: data,
    };
  } else {
    return false;
  }
};

export {
  getTokens,
  getTieredTokens,
  deductUserMicToken,
  deductUserCallToken,
  deductNumCallsToken,
  createOrRetrieveCustomer,
  manageSubscriptionStatusChange,
};
