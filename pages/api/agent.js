// pages/api/agent.js
// Compatibility proxy: old Next.js app shape -> new Agent v1 shape.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
    },
  },
};

function documentsToTranscriptContext(documents) {
  return (Array.isArray(documents) ? documents : [])
    .map((doc) => {
      if (typeof doc === "string") return doc;
      return doc?.snippet ?? doc?.text ?? doc?.content ?? "";
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function formatRecentChat(chatHistory, messages) {
  const source = Array.isArray(messages)
    ? messages
    : Array.isArray(chatHistory)
    ? chatHistory
    : [];

  return source
    .slice(-8)
    .map((message) => {
      const role =
        message?.role ||
        (message?.sender === "ChatGPT" ? "assistant" : message?.sender) ||
        "user";

      const content = message?.content || message?.message || "";

      if (!content) return null;

      return `${role}: ${content}`;
    })
    .filter(Boolean)
    .join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const baseUrl = (process.env.NEXT_PUBLIC_AGENT_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");

  if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
    return res.status(500).json({
      error: "Agent v1 base URL missing or invalid.",
    });
  }

  const {
    query,
    documents,
    chat_history,
    messages,
    metadata = {},
    persistMessages,
  } = req.body || {};

  const transcriptContext = documentsToTranscriptContext(documents);
  const recentChat = formatRecentChat(chat_history, messages);

  const userMessage = [
    recentChat ? `Recent chat context:\n${recentChat}` : null,
    query || "(no question provided)",
  ]
    .filter(Boolean)
    .join("\n\nUser question:\n");

  const soundUrl =
    metadata.soundUrl ||
    metadata.sound_url ||
    metadata.source_url ||
    "web-unknown-sound-url";

  const userId =
    metadata.user_id ||
    metadata.userId ||
    metadata?.user?.id ||
    "web-agent-proxy";

  const recordingId =
    metadata.recording_id ||
    metadata.recordingId ||
    soundUrl ||
    "web-recording";

  const recordingType =
    metadata.recording_type || metadata.recordingType || "mic";

  const shouldPersistMessages =
    metadata.persist_messages ??
    metadata.persistMessages ??
    persistMessages ??
    false;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const upstream = await fetch(`${baseUrl}/v1/agent/respond`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        recording_id: String(recordingId),
        recording_type: recordingType === "call" ? "call" : "mic",
        sound_url: String(soundUrl),
        user_id: String(userId),
        user_message: userMessage,
        transcript_context: transcriptContext,
        platform: "web",
        persist_messages: Boolean(shouldPersistMessages),
      }),
    });

    const responseText = await upstream.text();

    let data = null;

    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      console.error("Agent v1 returned non-JSON response:", {
        status: upstream.status,
        statusText: upstream.statusText,
        bodyPreview: responseText.slice(0, 300),
      });

      return res.status(502).json({
        error: "Agent v1 returned a non-JSON response.",
      });
    }

    if (!upstream.ok || data?.status !== "ok") {
      console.error("Agent v1 response error:", {
        status: upstream.status,
        statusText: upstream.statusText,
        data,
      });

      return res.status(upstream.status || 502).json({
        error: data?.error || "Agent v1 request failed.",
        raw: data,
      });
    }

    const agentText = data.assistant_message || "(No response from agent)";

    return res.status(200).json({
      text: agentText,
      answer: agentText,
      reply: agentText,
      raw: data,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      return res.status(504).json({
        error: "Agent v1 timed out.",
      });
    }

    console.error("Agent v1 proxy error:", error);

    return res.status(500).json({
      error: "Agent v1 proxy failed.",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
