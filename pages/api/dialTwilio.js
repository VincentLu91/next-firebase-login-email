export default async function handler(req, res) {
  // 🔒 CRITICAL SECURITY: Require authentication to prevent unauthorized phone calls
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized - Login required" });
  }

  try {
    console.log("dialTwilio called with query params:", req.query);
    const { to } = req.query;

    if (!to) {
      return res.status(400).json({ error: "Phone number is required" });
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
        body: JSON.stringify({ phoneNumber: to }),
      }
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
        `Failed to initiate call: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("Successfully initiated call:", data);
    res.status(200).json(data);
  } catch (error) {
    console.error("Error in dialTwilio:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });

    res.status(500).json({
      error: error.message,
      details: error.cause?.message || "Check server logs for more details",
    });
  }
}
