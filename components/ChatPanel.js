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
      style={{ display: "grid", gridTemplateRows: "1fr auto", minHeight: 420 }}
    >
      <div style={{ overflowY: "auto", padding: 8 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.sender === "user" ? "flex-end" : "flex-start",
              marginBottom: 8,
            }}
          >
            <div
              className="u-card"
              style={{
                maxWidth: "80%",
                padding: "8px 12px",
                background:
                  m.sender === "user" ? "var(--panel-2)" : "var(--panel)",
              }}
            >
              {m.message}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about this transcript…"
          rows={1}
          style={{
            flex: 1,
            resize: "none",
            height: 40,
            padding: "10px 12px",
            border: "1px solid var(--border)",
            borderRadius: 10,
            background: "var(--panel-2)",
            color: "var(--text)",
          }}
        />
        <button
          type="button"
          className="btn-primary u-pill"
          onClick={send}
          disabled={typing || !inputValue.trim()}
        >
          {typing ? "Thinking…" : "Send"}
        </button>
      </div>
    </div>
  );
}
