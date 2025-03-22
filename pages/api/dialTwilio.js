export default async function handler(req, res) {
  try {
    const { to } = req.query;

    if (!to) {
      return res.status(400).json({ error: "Phone number is required" });
    }

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

    if (!response.ok) {
      throw new Error("Failed to initiate call");
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Twilio API Error:", error);
    res.status(500).json({ error: error.message });
  }
}
