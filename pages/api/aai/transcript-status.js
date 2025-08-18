export default async function handler(req, res) {
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
