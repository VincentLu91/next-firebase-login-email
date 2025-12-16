import axios from "axios";

export default async function handler(req, res) {
  // 🔒 SECURITY: Require authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized - Login required" });
  }

  const Base_URL = "https://call-transcribe-heroku-b15b1132d70f.herokuapp.com";
  const endpoint = "/api/transcription";
  console.log("endpoint", endpoint);
  try {
    const response = await axios.get(Base_URL + endpoint);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Error hanging up call:", error);
    res.status(error.response?.status || 500).json({
      error: error.message || "An unexpected error occurred",
    });
  }
}
