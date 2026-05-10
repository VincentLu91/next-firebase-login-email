// components/ChatPanel.jsx
import { useEffect, useState, useRef } from "react";
import { useUser, useSupabaseClient } from "../utils/supabase-hooks";
import axios from "axios";

export default function ChatPanel({ sound, soundUrl }) {
  const user = useUser();
  const supabase = useSupabaseClient();

  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [copiedMessageIndex, setCopiedMessageIndex] = useState(null);
  const [pressedCopyIndex, setPressedCopyIndex] = useState(null);
  const endRef = useRef(null);

  const transcript = sound?.full_transcript || "";

  // --- persistence (same table/columns you used in pages/chatbot.js) ---
  const saveMessage = async (message, sender) => {
    if (!user?.id || !soundUrl) return;
    const { error } = await supabase
      .from("chat_history")
      .insert([{ user_id: user.id, message, sender, soundUrl }]);
    if (error) console.error("Error saving message:", error.message);
  };

  const fetchHistory = async () => {
    if (!user?.id || !soundUrl) return;
    const { data, error } = await supabase
      .from("chat_history")
      .select("*")
      .eq("user_id", user.id)
      .eq("soundUrl", soundUrl)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching chat history:", error.message);
      return;
    }
    setMessages(
      (data || []).map((m) => ({
        message: m.message,
        sender: m.sender === "User" ? "user" : "ChatGPT",
      })),
    );
  };

  useEffect(() => {
    fetchHistory();
  }, [user?.id, soundUrl]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- utilities copied from your Chatbot.js ---
  const arrayOfObjects = (arr) =>
    arr.map((chunk, index) => ({ title: String(index + 1), snippet: chunk }));

  const splitStringIntoChunks = (str, chunkSize) => {
    const words = (str || "").split(" ");
    const chunks = [];
    let current = "";
    for (const w of words) {
      if (current.split(" ").length < chunkSize)
        current += (current ? " " : "") + w;
      else {
        chunks.push(current.trim());
        current = w;
      }
    }
    if (current) chunks.push(current.trim());
    return arrayOfObjects(chunks);
  };

  const processMessageToChatGPT = async (chatMessages, userText) => {
    // normalize to the {role, content} list your agent expects
    const apiMessages = chatMessages.map((m) => ({
      role: m.sender === "ChatGPT" ? "assistant" : "user",
      content: m.message,
    }));

    try {
      const resp = await axios.post("/api/agent", {
        query: userText,
        documents: splitStringIntoChunks(transcript, 30),
        chat_history: apiMessages,
        messages: apiMessages,
        metadata: {
          soundUrl,
          user_id: user?.id,
          userId: user?.id,
          recording_type: sound?.file_name?.toLowerCase().includes("call")
            ? "call"
            : "mic",
          platform: "web",
          type: "chat",
        },
      });

      const agentText =
        resp?.data?.text ??
        resp?.data?.answer ??
        resp?.data?.output ??
        resp?.data?.reply ??
        "(No response from agent)";

      setMessages([...chatMessages, { message: agentText, sender: "ChatGPT" }]);
      saveMessage(agentText, "ChatGPT");
    } catch (err) {
      console.error("Agent error:", err?.response?.data || err.message);
      const fallback =
        "Sorry—I'm having trouble reaching the AI agent right now. Please try again.";
      setMessages([...chatMessages, { message: fallback, sender: "ChatGPT" }]);
      saveMessage(fallback, "ChatGPT");
    } finally {
      setTyping(false);
    }
  };

  const send = async () => {
    const text = inputValue.trim();
    if (!text) return;
    const next = [...messages, { message: text, sender: "user" }];
    setMessages(next);
    setInputValue("");
    setTyping(true);
    saveMessage(text, "User");
    await processMessageToChatGPT(next, text);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const copyToClipboard = async (text) => {
    const textToCopy = `${text}\n\n- Made with placeholder app`;
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!soundUrl) {
    return <p className="muted">Select a recording to start chatting.</p>;
  }

  return (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--muted-600)",
        borderRadius: "28px",
        background: "var(--bg-800)",
        padding: "24px",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            margin: 0,
            color: "var(--text-100)",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.04em",
          }}
        >
          AI Chat
        </h2>

        <p
          style={{
            margin: "6px 0 0",
            color: "var(--text-300)",
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          Ask questions about this recording
        </p>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          paddingRight: 6,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 16,
            }}
          >
            <button
              type="button"
              onClick={() => setInputValue("Summarize this recording")}
              style={{
                padding: "14px 22px",
                borderRadius: "999px",
                border: "1px solid var(--muted-600)",
                background: "var(--bg-700)",
                color: "var(--text-100)",
                fontFamily: "var(--font-family)",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Summarize this recording
            </button>

            <button
              type="button"
              onClick={() => setInputValue("What are the action items?")}
              style={{
                padding: "14px 22px",
                borderRadius: "999px",
                border: "1px solid var(--muted-600)",
                background: "var(--bg-700)",
                color: "var(--text-100)",
                fontFamily: "var(--font-family)",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              What are the action items?
            </button>

            <button
              type="button"
              onClick={() =>
                setInputValue("What was the last important thing said?")
              }
              style={{
                padding: "14px 22px",
                borderRadius: "999px",
                border: "1px solid var(--muted-600)",
                background: "var(--bg-700)",
                color: "var(--text-100)",
                fontFamily: "var(--font-family)",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              What was the last important thing said?
            </button>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.sender === "user" ? "flex-end" : "flex-start",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                position: "relative",
                width: m.sender === "ChatGPT" ? "100%" : "auto",
                maxWidth: m.sender === "ChatGPT" ? "100%" : "82%",
                padding: "18px",
                borderRadius: 24,
                border:
                  m.sender === "user"
                    ? "1px solid var(--accent-400)"
                    : "1px solid var(--muted-600)",
                background: m.sender === "user" ? "#3C36D9" : "var(--bg-700)",
                color: "var(--text-100)",
                lineHeight: 1.6,
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              <div
                style={{
                  marginBottom: 6,
                  color:
                    m.sender === "user" ? "var(--text-100)" : "var(--text-300)",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                {m.sender === "user" ? "You" : "AI Agent"}
              </div>

              <div>{m.message}</div>

              {m.sender === "ChatGPT" && (
                <button
                  type="button"
                  onClick={async () => {
                    await copyToClipboard(m.message);
                    setCopiedMessageIndex(i);
                    setTimeout(() => setCopiedMessageIndex(null), 1200);
                  }}
                  onMouseDown={() => setPressedCopyIndex(i)}
                  onMouseUp={() => setPressedCopyIndex(null)}
                  onMouseLeave={() => setPressedCopyIndex(null)}
                  onTouchStart={() => setPressedCopyIndex(i)}
                  onTouchEnd={() => setPressedCopyIndex(null)}
                  onTouchCancel={() => setPressedCopyIndex(null)}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 16,
                    padding: "8px 14px",
                    borderRadius: "999px",
                    border: "1px solid var(--muted-600)",
                    background: "var(--bg-800)",
                    color: "var(--text-100)",
                    fontFamily: "var(--font-family)",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow:
                      pressedCopyIndex === i
                        ? "none"
                        : "0 8px 18px rgba(0, 0, 0, 0.18)",
                    transform:
                      pressedCopyIndex === i
                        ? "translateY(1px)"
                        : "translateY(0)",
                    transition:
                      "box-shadow 120ms ease, transform 120ms ease, background 120ms ease",
                  }}
                >
                  Copy
                </button>
              )}
            </div>
          </div>
        ))}

        {typing && (
          <div
            style={{
              color: "var(--text-300)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Chatbot is thinking...
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginTop: 18,
        }}
      >
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about this recording..."
          rows={1}
          style={{
            flex: 1,
            resize: "none",
            height: 56,
            padding: "16px 22px",
            border: "1px solid var(--muted-600)",
            borderRadius: "24px",
            background: "var(--bg-700)",
            color: "var(--text-100)",
            fontFamily: "var(--font-family)",
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: "-0.1px",
            outline: "none",
          }}
        />

        <button
          type="button"
          onClick={send}
          disabled={typing || !inputValue.trim()}
          style={{
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--accent-400)",
            border: "none",
            borderRadius: "50%",
            color: "#101114",
            cursor: "pointer",
            transition: "var(--transition-base)",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22 2L11 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M22 2L15 22L11 13L2 9L22 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
