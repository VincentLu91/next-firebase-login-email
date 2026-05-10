import { supabase } from "../../utils/initSupabase";

export default async function handler(req, res) {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(403).json({
        error: "user_id is required",
      });
    }

    const { data: entitlement, error: fetchError } = await supabase
      .from("customers")
      .select("id, num_calls")
      .eq("id", user_id)
      .single();

    if (fetchError || !entitlement) {
      console.error("No call entitlement found:", fetchError);

      return res.status(403).json({
        error: "No call entitlement found for this user",
      });
    }

    const currentNumCalls = entitlement.num_calls ?? 0;

    if (currentNumCalls <= 0) {
      return res.status(403).json({
        error: "No calls remaining",
      });
    }

    const nextNumCalls = currentNumCalls - 1;

    const { data: updatedEntitlement, error: updateError } = await supabase
      .from("customers")
      .update({ num_calls: nextNumCalls })
      .eq("id", user_id)
      .select("id, num_calls")
      .single();

    if (updateError) {
      console.error("Failed to deduct call token:", updateError);

      return res.status(500).json({
        error: "Failed to deduct call token",
      });
    }

    return res.status(200).json({
      success: true,
      user_id: updatedEntitlement.id,
      num_calls: updatedEntitlement.num_calls,
    });
  } catch (error) {
    console.error("Error in /api/calls-token:", error);

    return res.status(500).json({
      error: error.message || "Failed to deduct call token",
    });
  }
}
