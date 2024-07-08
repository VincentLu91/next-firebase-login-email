import axios from "axios";

export default async function handler(req, res) {
  const { callControlID } = req.query;

  if (!callControlID) {
    return res.status(400).json({ error: "Missing callControlID" });
  }

  try {
    const response = await axios.post(
      `https://api.telnyx.com/v2/calls/${callControlID}/actions/hangup`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer KEY017EE15F9667935CDD8D6B422B40D671_Ko22qTGdS4engYHoawMjhB`,
        },
      }
    );

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Error hanging up call:", error);
    res.status(error.response?.status || 500).json({
      error: error.message || "An unexpected error occurred",
    });
  }
}
