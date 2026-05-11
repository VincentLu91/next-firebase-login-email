import { supabase } from "../../utils/initSupabase";

export default async function handler(req, res) {
  try {
    console.log("dialTwilio called with query params:", req.query);

    const { to, user_id } = req.query;

    if (!user_id) {
      return res.status(401).json({
        error: "Unauthorized - user_id required",
      });
    }

    if (!to) {
      return res.status(400).json({
        error: "Phone number is required",
      });
    }

    const { data: entitlement, error: entitlementError } = await supabase
      .from("customers")
      .select("id, num_calls")
      .eq("id", user_id)
      .single();

    if (entitlementError || !entitlement) {
      console.error("No call entitlement found:", entitlementError);

      return res.status(403).json({
        error: "No call entitlement found for this user",
      });
    }

    if ((entitlement.num_calls ?? 0) <= 0) {
      return res.status(403).json({
        error: "No calls remaining",
      });
    }

    const startTime = Date.now();

    console.log("Making request to Heroku endpoint...");

    const response = await fetch(
      "https://call-transcribe-heroku-b15b1132d70f.herokuapp.com/make-outbounding-call",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: to,
          customerId: user_id,
        }),
      },
    );

    const endTime = Date.now();

    console.log(`Heroku request took ${(endTime - startTime) / 1000} seconds`);

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Heroku API error response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });

      throw new Error(
        `Failed to initiate call: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    console.log("Successfully initiated call:", data);

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error in dialTwilio:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });

    return res.status(500).json({
      error: error.message,
      details: error.cause?.message || "Check server logs for more details",
    });
  }
}
