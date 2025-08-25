// pages/api/agent.js
// Robust proxy with env auto-detection and swap-guard.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Resolve envs (multiple names) and trim
  let baseUrl = (
    process.env.NEXT_AI_AGENT_BASE_URL ||
    process.env.AI_AGENT_BASE_URL ||
    process.env.AGENT_BASE_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");

  let apiKey = (
    process.env.AGENT_API_KEY ||
    process.env.AI_AGENT_API_KEY ||
    process.env.NEXT_AI_AGENT_API_KEY ||
    ""
  ).trim();

  const looksLikeUrl = (s) => /^https?:\/\//i.test(s);

  // If the values are swapped (key looks like URL and baseUrl does not), swap them
  if (looksLikeUrl(apiKey) && !looksLikeUrl(baseUrl)) {
    const tmp = apiKey;
    apiKey = baseUrl;
    baseUrl = tmp;
  }

  const baseUrlName = process.env.NEXT_AI_AGENT_BASE_URL
    ? "NEXT_AI_AGENT_BASE_URL"
    : process.env.AI_AGENT_BASE_URL
    ? "AI_AGENT_BASE_URL"
    : process.env.AGENT_BASE_URL
    ? "AGENT_BASE_URL"
    : "(none)";

  const apiKeyName = process.env.AGENT_API_KEY
    ? "AGENT_API_KEY"
    : process.env.AI_AGENT_API_KEY
    ? "AI_AGENT_API_KEY"
    : process.env.NEXT_AI_AGENT_API_KEY
    ? "NEXT_AI_AGENT_API_KEY"
    : "(none)";

  const { query, documents, chat_history, messages, metadata } = req.body || {};

  // Debug: transcript reach
  if (req.query.debug === "1") {
    const docText = (Array.isArray(documents) ? documents : [])
      .map((d) =>
        typeof d === "string" ? d : d?.snippet ?? d?.text ?? d?.content ?? ""
      )
      .filter(Boolean)
      .join("\n\n---\n\n");

    return res.status(200).json({
      docs: Array.isArray(documents) ? documents.length : 0,
      docChars: docText.length,
      sample: docText.slice(0, 200),
    });
  }

  // Debug: env presence and which names matched
  if (req.query.debug === "env") {
    return res.status(200).json({
      hasBaseUrl: !!baseUrl,
      hasApiKey: !!apiKey,
      baseUrlName,
      apiKeyName,
      baseUrlPreview: baseUrl || null,
      apiKeyPreview: apiKey
        ? `${apiKey.slice(0, 3)}...${apiKey.slice(-3)}`
        : null,
    });
  }

  // Compose prompt so agent MUST see the transcript
  const docText = (Array.isArray(documents) ? documents : [])
    .map((d) =>
      typeof d === "string" ? d : d?.snippet ?? d?.text ?? d?.content ?? ""
    )
    .filter(Boolean)
    .join("\n\n---\n\n");

  const composedQuery = [
    "SYSTEM: You answer questions using ONLY the transcript in CONTEXT.",
    "If the answer isn't in the context, say you can't find it.",
    metadata?.created_at ? `Document created_at: ${metadata.created_at}` : null,
    metadata?.source_url || metadata?.soundUrl
      ? `Source URL: ${metadata.source_url || metadata.soundUrl}`
      : null,
    "",
    "CONTEXT:",
    docText || "(no transcript provided)",
    "",
    "QUESTION:",
    query || "(no question provided)",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    if (!baseUrl || !looksLikeUrl(baseUrl)) {
      return res
        .status(500)
        .json({ error: `Agent base URL missing/invalid: "${baseUrl}"` });
    }
    if (!apiKey || looksLikeUrl(apiKey)) {
      return res.status(500).json({ error: "Agent API key missing/invalid" });
    }

    const upstream = await fetch(`${baseUrl}/v1/infer`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: composedQuery,
        chat_history,
        messages,
        documents,
        metadata,
      }),
    });

    const text = await upstream.text();
    if (!upstream.ok) return res.status(upstream.status).json({ error: text });

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }

    return res.status(200).json({
      text:
        data.text ||
        data.answer ||
        data.output ||
        data.reply ||
        (typeof data === "string" ? data : ""),
      raw: data,
    });
  } catch (err) {
    console.error("Agent proxy error:", err);
    return res.status(500).json({ error: "Agent proxy failed." });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "5mb" } } };
