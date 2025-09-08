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

const createSubscription = async (subscriptionId, customerId) => {
  // First verify we have a valid customer in our database
  const { data: customer } = await supabase
    .from("customers")
    .select("id, stripe_customer_id")
    .eq("stripe_customer_id", customerId)
    .single();

  // Do not proceed without a valid customer_id
  if (!customer?.id) {
    throw new Error(
      `Cannot create subscription: No customer found with Stripe ID ${customerId}`
    );
  }

  // Double check this is the right customer
  if (customer.stripe_customer_id !== customerId) {
    throw new Error(
      `Customer ID mismatch: ${customer.stripe_customer_id} !== ${customerId}`
    );
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price.product", "default_payment_method"],
  });

  const stripePriceId = subscription.items.data[0].price.id;
  const stripeProductId = subscription.items.data[0].price.product.id;

  // Get price and product from our database
  const { data: priceData } = await supabase
    .from("prices")
    .select("id")
    .eq("stripe_price_id", stripePriceId)
    .single();

  const { data: productData } = await supabase
    .from("products")
    .select("id")
    .eq("stripe_product_id", stripeProductId)
    .single();

  const { error: subscriptionError } = await supabase
    .from("subscriptions")
    .insert({
      stripe_subscription_id: subscriptionId,
      customer_id: customer.id,
      price_id: priceData?.id,
      product_id: productData?.id,
      stripe_price_id: stripePriceId,
      stripe_product_id: stripeProductId,
      stripe_product_name: subscription.items.data[0].price.product.name,
      cancel_at: subscription.cancel_at
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
    });

  if (subscriptionError) throw subscriptionError;

  // If subscription is active, update customer tokens based on plan
  if (subscription.status === "active" || subscription.status === "trialing") {
    const { data: price } = await supabase
      .from("prices")
      .select("mic_tokens, call_tokens")
      .eq("stripe_price_id", stripePriceId)
      .single();

    if (price) {
      const { error: customerError } = await supabase.from("customers").upsert({
        id: customer.id,
        mic_tokens: price.mic_tokens,
        call_tokens: price.call_tokens,
        num_calls: price.num_calls,
      });

      if (customerError) throw customerError;
    }
  }

  // Copy billing details to customer if available
  if (subscription.default_payment_method) {
    const { billing_details } = subscription.default_payment_method;
    await stripe.customers.update(customerId, {
      name: billing_details.name,
      phone: billing_details.phone,
      address: billing_details.address,
    });
  }
};

const manageSubscriptionStatusChange = async (
  subscriptionId,
  stripeCustomerId,
  userId,
  createAction = false,
  cancelAt = null
) => {
  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method", "items.data.price.product"],
  });

  // Get customer by their ID (which matches user ID)
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", userId)
    .single();

  if (!customer) {
    console.log(`No customer found with ID ${userId}`);
    return;
  }

  // Update stripe_customer_id if it's changed
  if (customer.stripe_customer_id !== stripeCustomerId) {
    await supabase
      .from("customers")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", userId);
  }

  // Get price and product info
  const priceId = subscription.items.data[0].price.id;
  const productId = subscription.items.data[0].price.product.id;

  const { data: priceData } = await supabase
    .from("prices")
    .select("id, mic_tokens, call_tokens, num_calls")
    .eq("stripe_price_id", priceId)
    .single();

  const { data: productData } = await supabase
    .from("products")
    .select("id")
    .eq("stripe_product_id", productId)
    .single();

  // Update or create subscription record
  const subscriptionData = {
    stripe_subscription_id: subscriptionId,
    customer_id: userId,
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

  // Check if subscription exists for this customer
  const { data: existingSubscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("customer_id", userId)
    .single();

  let subscriptionError;
  if (existingSubscription) {
    // Update existing subscription
    const { error } = await supabase
      .from("subscriptions")
      .update(subscriptionData)
      .eq("customer_id", userId);
    subscriptionError = error;
  } else {
    // Insert new subscription
    const { error } = await supabase
      .from("subscriptions")
      .insert(subscriptionData);
    subscriptionError = error;
  }

  if (subscriptionError) {
    console.log("Error upserting subscription:", subscriptionError);
    return;
  }

  // Update customer tokens if subscription is active
  if (subscription.status === "active" || subscription.status === "trialing") {
    if (priceData) {
      await supabase
        .from("customers")
        .update({
          mic_tokens: priceData.mic_tokens,
          call_tokens: priceData.call_tokens,
          num_calls: priceData.num_calls,
        })
        .eq("id", userId);
    }
  }

  // Copy billing details to Stripe customer if needed
  if (createAction && subscription.default_payment_method) {
    const { billing_details } = subscription.default_payment_method;
    await stripe.customers.update(stripeCustomerId, {
      name: billing_details.name,
      phone: billing_details.phone,
      address: billing_details.address,
    });
  }

  console.log(`Subscription [${subscriptionId}] updated for user [${userId}]`);
};

const deleteSubscription = async (customerId) => {
  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("customer_id", customerId);

  if (error) {
    console.log("Error deleting subscription:", error);
    return false;
  }
  return true;
};

const upsertProductRecord = async (product) => {
  console.log("Stripe product data:", product);

  const productData = {
    stripe_product_id: product.id,
    product_name: product.name,
    description: product.description,
    active: product.active,
    product_role: product.metadata?.role ?? null,
    tax_code: product.tax_code ?? null,
  };

  console.log("Product data to upsert:", productData);

  // First check if product exists
  const { data: existingProduct } = await supabase
    .from("products")
    .select("id")
    .eq("stripe_product_id", product.id)
    .single();

  if (existingProduct) {
    // Update existing product
    const { data, error } = await supabase
      .from("products")
      .update(productData)
      .eq("id", existingProduct.id)
      .select();

    if (error) {
      console.error("Error updating product:", error);
      throw error;
    }
    console.log("Updated product result:", data);
  } else {
    // Insert new product
    const { data, error } = await supabase
      .from("products")
      .insert([productData])
      .select();

    if (error) {
      console.error("Error inserting product:", error);
      throw error;
    }
    console.log("Inserted product result:", data);
  }

  console.log(`Product inserted/updated: ${product.id}`);
};

const upsertPriceRecord = async (price) => {
  // First get the product record to establish foreign key relationship
  const { data: productData } = await supabase
    .from("products")
    .select("id")
    .eq("stripe_product_id", price.product)
    .single();

  if (!productData) {
    throw new Error(`No product found for Stripe product ID: ${price.product}`);
  }

  const priceData = {
    stripe_price_id: price.id,
    product_id: productData.id,
    stripe_product_id: price.product,
    active: price.active,
    billing_scheme: price.billing_scheme,
    currency: price.currency,
    description: price.nickname,
    type: price.type,
    unit_amount: price.unit_amount,
    interval: price.recurring?.interval ?? null,
    interval_count: price.recurring?.interval_count ?? null,
    trial_period_days: price.recurring?.trial_period_days ?? null,
    /*mic_tokens: price.metadata?.mic_tokens
      ? parseInt(price.metadata.mic_tokens)
      : null,
    call_tokens: price.metadata?.call_tokens
      ? parseInt(price.metadata.call_tokens)
      : null,
    num_calls: price.metadata?.num_calls
      ? parseInt(price.metadata.num_calls)
      : null,*/
  };

  const { error } = await supabase.from("prices").upsert([priceData], {
    onConflict: "stripe_price_id",
  });
  if (error) throw error;
  console.log(`Price inserted/updated: ${price.id}`);
};

export {
  getTokens,
  getTieredTokens,
  deductUserMicToken,
  deductUserCallToken,
  deductNumCallsToken,
  createOrRetrieveCustomer,
  createSubscription,
  manageSubscriptionStatusChange,
  deleteSubscription,
  upsertProductRecord,
  upsertPriceRecord,
};
