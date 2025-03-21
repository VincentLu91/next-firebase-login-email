import * as React from "react";
import { useEffect, useCallback, useState } from "react";

const ASSEMBLY_AI_KEY =
  process.env.ASSEMBLY_AI_KEY || "8acedd22ef7542259df0f36dc8bf18ac";

const PhoneRecording2 = () => {
  const [transcriptionText, setTranscriptionText] = useState("");
  // const fetchTranscription = async () => {
  //   const url = "/api/getTranscription";
  //   const res = await fetch(url);
  //   const data = await res.json();
  //   console.log("data", data);
  //   setTranscriptionText(data?.transcription);
  // };

  const onConnectServer = async () => {
    const wsUrl = `wss://call-transcribe-heroku-b15b1132d70f.herokuapp.com`;
    let ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      keepAlive();
    };

    ws.onclose = () => {
      console.log("WebSocket closed. Reconnecting...");
      reconnect();
    };

    function keepAlive() {
      if (ws.readyState === WebSocket.OPEN) {
        console.log("Sending ping to server");
        ws.send(JSON.stringify({ event: "ping" }));
      }
      setTimeout(keepAlive, 20 * 1000); // Send every 50 seconds
    }

    function reconnect() {
      setTimeout(() => {
        ws = new WebSocket(wsUrl);
      }, 5000);
    }

    ws.onmessage = function (msg) {
      console.log("on new message...", msg.data);
      const data = JSON.parse(msg.data);
      if (data.event === "interim-transcription") {
        setTranscriptionText(data.text);
      }
    };
  };

  return (
    <div>
      <button onClick={onConnectServer}>Connect to Server</button>
      <div>
        <p>Your text is:</p>
        <p>{transcriptionText}</p>
      </div>
    </div>
  );
};

export default PhoneRecording2;
