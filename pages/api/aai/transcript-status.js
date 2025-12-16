export default async function handler(req, res) {
  // 🔒 SECURITY: Require authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized - Login required" });
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing ?id" });

  try {
    const r = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
      },
    });
    const data = await r.json();
    return res.status(r.ok ? 200 : r.status).json(data);
  } catch (err) {
    console.error("status error", err);
    return res.status(500).json({ error: "status fetch failed" });
  }
}
