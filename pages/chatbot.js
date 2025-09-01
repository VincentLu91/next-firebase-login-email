import { useEffect, useState, useRef, useCallback } from "react";
import styles from "../styles/Chat.module.css";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { useRouter } from "next/router";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";

function ChatBot() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useUser();
  const supabase = useSupabaseClient();
  const [customer, setCustomer] = useState(null);
  const [soundUrl, setSoundUrl] = useState(null);
  const sound = useSelector((state) => state.recordingReducer.sound);

  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState([]);

  const checkAuth = useCallback(
    async (user) => {
      if (user) {
        console.log("Supabase user is: ", user.id);
        let customerInfo = await supabase
          .from("customers")
          .select("*")
          .eq("email_address", user.email);
        console.log("customerInfo is: ", customerInfo.data[0]); //customerInfo.data[0].id
        setCustomer(customerInfo.data[0]);
        let subscriptionResponse = await supabase
          .from("subscriptions")
          .select()
          .eq("customer_id", customerInfo.data[0].id);
      } else {
        // User is signed out
        console.log(
          "The user is inauthenticated, redirecting back to signin page"
        );
        router.push("/signin");
      }
    },
    [router, supabase]
  );

  useEffect(() => {
    checkAuth(user);
  }, [checkAuth, user]);

  useEffect(() => {
    console.log("authUser is: ", customer); // uid
    if (customer) {
      if (sound) {
        const uri = supabase.storage
          .from("recreate-ai-storage-bucket")
          .getPublicUrl(sound.original_file_name);
        console.log("uri is: ", uri.data.publicUrl);
        console.log(uri.data.publicUrl);
        setSoundUrl(uri.data.publicUrl);
      } else {
        router.push("/signin");
      }
    }
  }, [dispatch, sound, customer, supabase, router]);

  const arrayOfObjects = (arr) => {
    const docs = arr.map((chunk, index) => ({
      title: String(index + 1),
      snippet: chunk,
    }));
    console.log(typeof docs);
    return docs;
  };

  const splitStringIntoChunks = (str, chunkSize) => {
    const words = str.split(" ");
    const chunks = [];
    let currentChunk = "";

    for (const word of words) {
      if (currentChunk.split(" ").length < chunkSize) {
        currentChunk += (currentChunk === "" ? "" : " ") + word;
      } else {
        chunks.push(currentChunk.trim());
        currentChunk = word;
      }
    }

    if (currentChunk !== "") {
      chunks.push(currentChunk.trim());
    }

    console.log(chunks);
    const docs = arrayOfObjects(chunks);
    console.log(docs);

    return docs;
  };

  const saveMessageToSupabase = async (message, sender, userId, soundUrl) => {
    const { data, error } = await supabase.from("chat_history").insert([
      {
        user_id: userId, // Replace with the actual user ID
        message: message,
        sender: sender,
        soundUrl: soundUrl,
      },
    ]);

    if (error) {
      console.error("Error saving message:", error.message);
    } else {
      console.log("Message saved:", data);
    }
  };

  const getChatHistory = async (userId) => {
    const { data, error } = await supabase
      .from("chat_history")
      .select("*")
      .eq("user_id", userId)
      .eq("soundUrl", soundUrl)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching chat history:", error.message);
      return [];
    } else {
      return data;
    }
  };

  useEffect(() => {
    const fetchHistory = async () => {
      const chatHistory = await getChatHistory(user.id);
      setMessages(
        chatHistory.map((msg) => ({
          message: msg.message,
          sender: msg.sender === "User" ? "user" : "ChatGPT",
        }))
      );
    };
    if (soundUrl) {
      fetchHistory();
    }
  }, [user.id, soundUrl]);

  const handleSend = async (message) => {
    const newMessage = {
      message: message,
      sender: "user",
      direction: "outgoing",
    };

    const newMessages = [...messages, newMessage];
    setMessages(newMessages);
    setTyping(true);
    // Save user message to Supabase
    await saveMessageToSupabase(message, "User", user.id, soundUrl);
    await processMessageToChatGPT(newMessages, message);
  };

  async function processMessageToChatGPT(chatMessages, message) {
    let apiMessages = chatMessages.map((messageObject) => {
      let role = "";
      if (messageObject.sender === "ChatGPT") {
        role = "assistant";
      } else {
        role = "user";
      }
      return { role: role, content: messageObject.message };
    });

    const systemMessage = {
      role: "system",
      content: "Explain all concepts like I am 10 years old",
    };

    const apiRequestBody = {
      model: "gpt-3.5-turbo",
      messages: [systemMessage, ...apiMessages],
    };

    await axios
      .post(
        "/api/agent", // <-- proxy to your FastAPI agent
        {
          // keep your exact inputs
          query: message,
          documents: splitStringIntoChunks(sound.full_transcript, 30),

          // (optional) pass history in a generic form many agents accept
          chat_history: apiMessages, // [{role, content}, ...]
          messages: apiMessages, // duplicate key for compatibility
          // add any metadata you want your agent to see:
          metadata: { soundUrl },
        }
      )
      .then((response) => {
        setTyping(false);

        // normalize: agent may return {text} or {answer} etc.
        const agentText =
          response?.data?.text ??
          response?.data?.answer ??
          response?.data?.output ??
          response?.data?.reply ??
          "(No response from agent)";

        console.log(agentText);

        setMessages([
          ...chatMessages,
          {
            message: agentText,
            sender: "ChatGPT",
          },
        ]);

        // Save ChatGPT response to Supabase
        saveMessageToSupabase(agentText, "ChatGPT", user.id, soundUrl);
      })
      .catch((err) => {
        setTyping(false);
        console.error("Agent error:", err?.response?.data || err.message);
        setMessages([
          ...chatMessages,
          {
            message:
              "Sorry—I'm having trouble reaching the AI agent right now. Please try again.",
            sender: "ChatGPT",
          },
        ]);
      });
  }

  const messagesEndRef = useRef(null);
  const [inputValue, setInputValue] = useState("");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        handleSend(inputValue);
        setInputValue("");
      }
    }
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      handleSend(inputValue);
      setInputValue("");
    }
  };

  return (
    <div className={styles.container}>
      <button className="u-pill" onClick={() => router.push("/audioplayer")}>
        ← Back to Audio Player
      </button>
      <div className={styles.chatContainer}>
        <div className={styles.messageList}>
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`${styles.messageWrapper} ${
                msg.sender === "user" ? styles.messageWrapperUser : ""
              }`}
            >
              <div
                className={`${styles.message} ${
                  msg.sender === "user" ? styles.messageUser : styles.messageBot
                }`}
              >
                {msg.message}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className={styles.inputContainer}>
          <div className={styles.inputWrapper}>
            <textarea
              className={styles.input}
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              rows={1}
            />
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={!inputValue.trim() || typing}
            >
              Send
            </button>
          </div>
          {typing && (
            <div className={styles.typingIndicator}>ChatGPT is typing...</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatBot;
