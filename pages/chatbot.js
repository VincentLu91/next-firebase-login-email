import { useEffect, useState, useRef, useCallback } from "react";
// import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
// import {
//   MainContainer,
//   ChatContainer,
//   MessageList,
//   Message,
//   MessageInput,
//   TypingIndicator,
// } from "@chatscope/chat-ui-kit-react";
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
  const [messages, setMessages] = useState([
    {
      message: "Hello, I'm ChatGPT",
      sender: "ChatGPT",
    },
  ]);

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
        router.push("/library");
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
          sender: msg.sender,
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
        "https://api.cohere.ai/v1/chat",
        {
          model: "command",
          message: message,
          temperature: 0.3,
          chat_history: [],
          prompt_truncation: "auto",
          stream: false,
          citation_quality: "accurate",
          connectors: [],
          documents: splitStringIntoChunks(sound.full_transcript, 30),
        },
        {
          headers: {
            Authorization: "Bearer q9pUdf7PjyyKMPM1Hk2Jhtv4tXJZY41dzEZ19Nuy",
            "Content-Type": "application/json",
          },
        }
      )
      .then((response) => {
        setTyping(false);
        console.log(response.data.text);
        setMessages([
          ...chatMessages,
          {
            message: response.data.text,
            sender: "ChatGPT",
          },
        ]);
        // Save ChatGPT response to Supabase
        saveMessageToSupabase(response.data.text, "ChatGPT", user.id, soundUrl);
      });

    //return response.data.text;
  }

  return (
    <div>
      <button onClick={() => router.push("/audioplayer")}>Go to ChatBot</button>
      <div
        style={{ position: "relative", height: "800px", width: "1000px" }}
      ></div>
    </div>
  );
}

export default ChatBot;
