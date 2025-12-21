// pages/api/test-add-credits.js
// Simple test endpoint to verify token addition logic works
const { supabase } = require("../../utils/initSupabase");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method POST required" });
  }

  const { user_id, token_type, token_amount } = req.body;

  // Validation
  if (!user_id || !token_type || !token_amount) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["user_id", "token_type", "token_amount"],
      received: { user_id, token_type, token_amount },
    });
  }

  if (!["mic_tokens", "call_tokens"].includes(token_type)) {
    return res.status(400).json({
      error: "Invalid token_type",
      message: "Must be 'mic_tokens' or 'call_tokens'",
    });
  }

  const amount = parseInt(token_amount);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      error: "Invalid token_amount",
      message: "Must be a positive number",
    });
  }

  try {
    console.log(`\n🧪 TEST: Adding ${amount} ${token_type} to user ${user_id}`);

    // Step 1: Fetch current customer data
    console.log("📊 Step 1: Fetching customer...");
    const { data: customer, error: fetchError } = await supabase
      .from("customers")
      .select(`id, ${token_type}, email_address`)
      .eq("id", user_id)
      .single();

    if (fetchError) {
      console.error("❌ Fetch error:", fetchError);
      return res.status(500).json({
        error: "Failed to fetch customer",
        details: fetchError,
        user_id,
      });
    }

    if (!customer) {
      console.error("❌ Customer not found");
      return res.status(404).json({
        error: "Customer not found",
        user_id,
        message: "This user doesn't exist in the customers table",
      });
    }

    console.log("✅ Customer found:", {
      id: customer.id,
      email: customer.email_address,
      currentTokens: customer[token_type],
    });

    // Step 2: Calculate new token count
    const currentTokens = customer[token_type] || 0;
    const newTokens = currentTokens + amount;

    console.log(
      `💰 Step 2: Calculating: ${currentTokens} + ${amount} = ${newTokens}`
    );

    // Step 3: Update the database
    console.log("📝 Step 3: Updating database...");
    const { data: updatedData, error: updateError } = await supabase
      .from("customers")
      .update({ [token_type]: newTokens })
      .eq("id", user_id)
      .select();

    if (updateError) {
      console.error("❌ Update error:", updateError);
      return res.status(500).json({
        error: "Failed to update tokens",
        details: updateError,
        attempted: { user_id, token_type, newTokens },
      });
    }

    console.log("✅ SUCCESS! Tokens updated");
    console.log("Updated data:", updatedData);

    return res.status(200).json({
      success: true,
      message: `Successfully added ${amount} ${token_type}`,
      before: currentTokens,
      added: amount,
      after: newTokens,
      customer: {
        id: customer.id,
        email: customer.email_address,
      },
