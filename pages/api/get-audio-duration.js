import getBlobDuration from "get-blob-duration";

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { audioURL } = req.body;

      if (!audioURL) {
        return res.status(400).json({ error: "audioURL is required" });
      }

      // Fetch the audio file and get the blob duration in seconds
      const response = await fetch(audioURL);
      const blob = await response.blob();
      const durationSeconds = await getBlobDuration(blob);

      // Send the duration in seconds as a response
      return res.status(200).json({ durationSeconds });
    } catch (error) {
      return res.status(500).json({ error: "Error retrieving audio duration" });
    }
  } else {
    // Handle any other HTTP method
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}
