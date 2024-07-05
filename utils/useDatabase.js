import { supabase } from "./initSupabase";
import Stripe from "stripe";

const stripe = new Stripe(
  "sk_test_51Jx1cdLBlaDAR7THINnFtmhlbxt3oaeehIMdTtpTitqJtX5eTtBenCXEF1bnHUN8xvpzUSAxgFhut1BfRu1bZljo00F6QMtxgc",
  {
    // https://github.com/stripe/stripe-node#configuration
    apiVersion: "2023-10-16",
  }
);

// utils/useDatabase.js
const getTokens = async (customerId, typeOfToken) => {
  // Validate typeOfToken
  const validTokenTypes = ["mic_tokens", "call_tokens"];
  if (!validTokenTypes.includes(typeOfToken)) {
    throw new Error(`Invalid typeOfToken: ${typeOfToken}`);
  }

  // Get customer's UUID from mapping table.
  const {
    data: { id: uuid, [typeOfToken]: tokens }, // Use computed property to select the token based on typeOfToken
    error: noCustomerError,
  } = await supabase
    .from("customers")
    .select("id, " + typeOfToken) // Select the token based on typeOfToken
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

  // Validate typeOfToken
  const validTokenTypes = ["mic_tokens", "call_tokens"];
  if (!validTokenTypes.includes(typeOfToken)) {
    throw new Error(`Invalid typeOfToken: ${typeOfToken}`);
  }

  // Get customer's UUID from mapping table.
  const {
    data: { [typeOfToken]: tokens }, // Use computed property to select the token based on typeOfToken
    error: noPriceError,
  } = await supabase
    .from("prices")
    .select("id, " + typeOfToken) // Select the token based on typeOfToken
    .eq("id", price_id)
    .single();

  if (noPriceError) return false;

  console.log(`tiered${typeOfToken}: `, tokens.data);
  return tokens;
};

const deductUserMicToken = async (customerId, tokensToDeduct) => {
  // Get customer's UUID from mapping table.
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
  // Get customer's UUID from mapping table.
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

export { getTokens, getTieredTokens, deductUserMicToken, deductUserCallToken };
