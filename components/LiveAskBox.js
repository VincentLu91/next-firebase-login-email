import * as React from "react";

export default function LiveAskBox({
  contextText = "",
  disabled = false,
  placeholder = "Ask about the conversation so far...",
  askLiveState,
  setAskLiveState,
  metadata = {},
}) {
  const [fallbackState, setFallbackState] = React.useState({
    question: "",
    answer: "",
    error: "",
  });

  const state = askLiveState || fallbackState;
  const updateState = setAskLiveState || setFallbackState;

  const question = state.question || "";
  const answer = state.answer || "";
  const error = state.error || "";

  const setQuestion = (value) => {
    updateState((prev) => ({
      ...(prev || {}),
      question: value,
    }));
  };

  const setAnswer = (value) => {
    updateState((prev) => ({
      ...(prev || {}),
      answer: value,
    }));
  };

  const setError = (value) => {
    updateState((prev) => ({
      ...(prev || {}),
      error: value,
    }));
  };

  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const askLive = async () => {
    const trimmedQuestion = question.trim();
    const trimmedContext = contextText.trim();
    const contextForAskLive = trimmedContext.slice(-1400);

    if (!trimmedQuestion) return;

    if (!trimmedContext) {
      setError("No transcript available yet.");
      setAnswer("");
      return;
    }

    setLoading(true);
    setError("");
    setAnswer("");
    setCopied(false);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: trimmedQuestion,
          documents: [
            {
              text: contextForAskLive,
            },
          ],
          chat_history: [],
          metadata: {
            ...metadata,
            mode: "ask_live",
            type: "ask_live",
            platform: "web",
            persistMessages: false,
            persist_messages: false,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Ask Live failed.");
      }

      setAnswer(
        data?.text || "I couldn't find an answer in the transcript yet.",
      );
    } catch (err) {
      setError(err?.message || "Ask Live failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        marginTop: 18,
        padding: 18,
        background: "rgba(255,255,255,.03)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 18,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: 10,
          color: "var(--text)",
        }}
      >
        Ask Live
      </div>

      <div
        style={{
          marginBottom: 12,
          color: "var(--text-400)",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        Ask about the recent transcript while recording is still happening.
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value);
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              askLive();
            }
          }}
          placeholder={placeholder}
          disabled={disabled || loading}
          style={{
            flex: 1,
            minWidth: 240,
            background: "rgba(255,255,255,.06)",
            color: "var(--text)",
            border: "1px solid rgba(255,255,255,.12)",
            padding: "12px 14px",
            borderRadius: 12,
            outline: 0,
          }}
        />

        <button
          type="button"
          onClick={askLive}
          disabled={disabled || loading || !question.trim()}
          className="btn btn-primary"
        >
          {loading ? "Asking..." : "Ask"}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 10,
            color: "#fca5a5",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {answer && (
        <div
          style={{
            marginTop: 14,
            color: "var(--text)",
            lineHeight: 1.6,
            whiteSpace: "pre-line",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <strong>Answer</strong>

            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(answer);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                } catch (err) {
                  setError("Could not copy answer.");
                }
              }}
              className="btn btn-ghost"
              style={{
                padding: "6px 10px",
                fontSize: 13,
                boxShadow: "none",
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {answer}
        </div>
      )}
    </div>
  );
}
