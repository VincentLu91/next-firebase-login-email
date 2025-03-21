import * as React from "react";
import { useEffect, useCallback, useState } from "react";
// import WebSocket, { WebSocketServer } from "ws";

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
    const response = await fetch("/api/token");
    const data = await response.json();
    console.log("DATOKEN", data);
    if (data.error) {
      alert(data.error);
    }

    const { token } = data;

    // if (!window.socket) {
    //   // establish wss with AssemblyAI (AAI) at 16000 sample rate
    //   window.socket = await new WebSocket(
    //     `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`
    //   );
    // }
    // const assembly = new WebSocket(
    //   "wss://api.assemblyai.com/v2/realtime/ws?sample_rate=8000&",
    //   {
    //     headers: { authorization: ASSEMBLY_AI_KEY },
    //     handshakeTimeout: 10000, // 10 second timeout
    //   }
    // );
    console.log("token", token);
    const assembly = new WebSocket(
      `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=8000&token=${token}`
    );

    assembly.onopen = () => console.log("connectt to server");
    // Handle connection errors
    assembly.onerror = (error) => {
      console.error("AssemblyAI WebSocket error2:", error);
    };
    const texts = {};
    assembly.onmessage = (assemblyMsg) => {
      console.log("New message from twilio====");
      try {
        const res = JSON.parse(assemblyMsg.data);
        texts[res.audio_start] = res.text;
        const keys = Object.keys(texts);
        keys.sort((a, b) => a - b);
        let msg = "";
        for (const key of keys) {
          if (texts[key]) {
            msg += ` ${texts[key]}`;
          }
        }
        console.log("New message70:", msg);
        setTranscriptionText(msg);

        //  latestTranscription = msg; // Store the latest transcription

        // Broadcast to all connected clients
        //  wss.clients.forEach((client) => {
        //    console.log("client.readyState", client.readyState);
        //    if (client.readyState === WebSocket.OPEN) {
        //      try {
        //        console.log("sent message to frontend==");
        //        client.send(
        //          JSON.stringify({
        //            event: "interim-transcription",
        //            text: msg,
        //          })
        //        );
        //      } catch (error) {
        //        console.error("Error broadcasting transcription:", error);
        //      }
        //    }
        //  });
      } catch (error) {
        console.error("Error processing AssemblyAI message:", error);
      }
    };
  };

  return (
    <div>
      {/* <button onClick={fetchTranscription}>Click here </button> */}
      <button onClick={onConnectServer}>Connect to Server</button>

      <div>
        <p>Your text is:</p>
        <p>{transcriptionText}</p>
      </div>
    </div>
  );
};

export default PhoneRecording2;
