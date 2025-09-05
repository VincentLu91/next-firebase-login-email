import { supabase } from "./initSupabase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Token management functions
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

// Stripe-related functions
const createOrRetrieveCustomer = async ({ email, uuid }) => {
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
};

const manageSubscriptionStatusChange = async (
  subscriptionId,
  customerId,
  createAction = false,
  cancelAt = null
) => {
  // Get customer's UUID from Stripe metadata
  const stripeCustomer = await stripe.customers.retrieve(customerId);
  const supabaseUUID = stripeCustomer.metadata.supabaseUUID;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method", "items.data.price.product"],
  });

  const priceId = subscription.items.data[0].price.id;
  const productId = subscription.items.data[0].price.product.id;

  // Get price and product from our database
  const { data: priceData } = await supabase
    .from("prices")
    .select("id")
    .eq("stripe_price_id", priceId)
    .single();

  const { data: productData } = await supabase
    .from("products")
    .select("id")
    .eq("stripe_product_id", productId)
    .single();

  // First try to find existing subscription
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  const subscriptionData = {
    stripe_subscription_id: subscriptionId,
    customer_id: supabaseUUID,
    price_id: priceData?.id,
    product_id: productData?.id,
    stripe_price_id: priceId,
    stripe_product_id: productId,
    stripe_product_name: subscription.items.data[0].price.product.name,
    cancel_at: cancelAt
      ? new Date(cancelAt * 1000).toISOString()
      : subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000).toISOString()
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    created: new Date(subscription.created * 1000).toISOString(),
    current_period_start: new Date(
      subscription.current_period_start * 1000
    ).toISOString(),
    current_period_end: new Date(
      subscription.current_period_end * 1000
    ).toISOString(),
  };

  // If subscription exists, include its ID
  if (existingSub?.id) {
    subscriptionData.id = existingSub.id;
  }

  const { error } = await supabase
    .from("subscriptions")
    .upsert(subscriptionData);

  if (error) throw error;

  console.log(
    `Subscription [${subscription.id}] updated for user [${supabaseUUID}]`
  );

  // If subscription is active, update customer tokens based on plan
  if (subscription.status === "active" || subscription.status === "trialing") {
    const { data: price } = await supabase
      .from("prices")
      .select("mic_tokens, call_tokens")
      .eq("stripe_price_id", priceId)
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
