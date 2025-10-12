// components/ChatPanel.jsx
import { useEffect, useState, useRef } from "react";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import axios from "axios";

export default function ChatPanel({ sound, soundUrl }) {
  const user = useUser();
  const supabase = useSupabaseClient();

  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
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
      }))
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
        metadata: { soundUrl },
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

  if (!soundUrl) {
    return <p className="muted">Select a recording to start chatting.</p>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "1fr auto",
        height: "600px", // Leave room for input area which is ~100px
      }}
    >
      <div style={{ overflowY: "auto", padding: "var(--space-4)" }}>
        {messages.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "200px",
              gap: "var(--space-3)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "var(--space-3)",
              }}
            >
              <button
                onClick={() => setInputValue("Summarize this document")}
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--radius-full, 24px)",
                  border: "1px dotted var(--muted-600)",
                  background: "var(--bg-700)",
                  color: "var(--text-100)",
                  fontFamily: "var(--font-family)",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "var(--transition-base)",
                  letterSpacing: "-0.1px",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "var(--bg-600)";
                  e.target.style.borderColor = "var(--muted-500)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "var(--bg-700)";
                  e.target.style.borderColor = "var(--muted-600)";
                }}
              >
                Summarize this document
              </button>
              <button
                onClick={() => setInputValue("To do items")}
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--radius-full, 24px)",
                  border: "1px dotted var(--muted-600)",
                  background: "var(--bg-700)",
                  color: "var(--text-100)",
                  fontFamily: "var(--font-family)",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "var(--transition-base)",
                  letterSpacing: "-0.1px",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "var(--bg-600)";
                  e.target.style.borderColor = "var(--muted-500)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "var(--bg-700)";
                  e.target.style.borderColor = "var(--muted-600)";
                }}
              >
                To do items
              </button>
            </div>
            <div>
              <button
                onClick={() => setInputValue("last thing speaker said")}
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--radius-full, 24px)",
                  border: "1px dotted var(--muted-600)",
                  background: "var(--bg-700)",
                  color: "var(--text-100)",
                  fontFamily: "var(--font-family)",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "var(--transition-base)",
                  letterSpacing: "-0.1px",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "var(--bg-600)";
                  e.target.style.borderColor = "var(--muted-500)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "var(--bg-700)";
                  e.target.style.borderColor = "var(--muted-600)";
                }}
              >
                last thing speaker said
              </button>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.sender === "user" ? "flex-end" : "flex-start",
              marginBottom: "var(--space-3)",
            }}
          >
            <div
              style={{
                maxWidth: "86%",
                padding: "var(--space-4)",
                borderRadius: "var(--radius-card)",
                background:
                  m.sender === "user"
                    ? "rgba(245, 184, 61, 0.16)"
                    : "var(--bg-700)",
                color: "var(--text-100)",
                fontFamily: "var(--font-family)",
                fontSize: "16px",
                lineHeight: "24px",
                fontWeight: 500,
                letterSpacing: "-0.1px",
              }}
            >
              {m.message}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "var(--space-3)",
          borderTop: "1px solid var(--muted-600)",
          background: "var(--bg-800)",
        }}
      >
        {typing && (
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-400)",
              marginBottom: "var(--space-2)",
            }}
          >
            Chatbot is thinking...
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            alignItems: "center",
          }}
        >
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your message..."
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              height: 48,
              padding: "var(--space-3) var(--space-5)",
              border: "1px solid var(--muted-600)",
              borderRadius: "var(--radius-input)",
              background: "var(--bg-700)",
              color: "var(--text-100)",
              fontFamily: "var(--font-family)",
              fontSize: "14px",
              fontWeight: 500,
              letterSpacing: "-0.1px",
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
    </div>
  );
}
