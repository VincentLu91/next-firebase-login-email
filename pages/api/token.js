export default async function handler(req, res) {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey)
      return res.status(500).json({ error: "Missing ASSEMBLYAI_API_KEY" });

    // Allow overrides via query, but clamp to documented limits
    const ttl = Math.max(1, Math.min(600, Number(req.query.ttl || 60))); // 1..600
    const maxSession = Math.max(
      60,
      Math.min(10800, Number(req.query.max || 3600))
    ); // 60..10800

    const url = new URL("https://streaming.assemblyai.com/v3/token");
    url.searchParams.set("expires_in_seconds", String(ttl));
    url.searchParams.set("max_session_duration_seconds", String(maxSession));

    console.log(
      "[Token API] Requesting token from AssemblyAI with key:",
      apiKey.substring(0, 8) + "..."
    );
    const r = await fetch(url, { headers: { Authorization: apiKey } });
    console.log("[Token API] AssemblyAI response status:", r.status);
    const data = await r.json();
    console.log("[Token API] AssemblyAI response data:", data);
    return res.status(r.ok ? 200 : r.status).json(data);
  } catch (err) {
    console.error("Token mint failed:", err);
    return res.status(500).json({ error: "Token mint failed" });
  }
}
