import * as React from "react";
import { useEffect, useCallback, useState } from "react";
import axios from "axios";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { isValidPhoneNumber } from "react-phone-number-input";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { supabase } from "../utils/initSupabase";
import {
  updateRecordingList,
  setCallControlID,
} from "../redux/recording/actions";
import moment from "moment";

import { useDispatch, useSelector } from "react-redux";

const ASSEMBLY_AI_KEY =
  process.env.ASSEMBLY_AI_KEY || "8acedd22ef7542259df0f36dc8bf18ac";

const PhoneRecording2 = () => {
  const [transcriptionText, setTranscriptionText] = useState("");
  const [phoneNumber, setPhoneNumber] = React.useState(null);
  const [customer, setCustomer] = useState(null);
  const user = useUser();
  const router = useRouter();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const dispatch = useDispatch();
  const recordingList = useSelector(
    (state) => state.recordingReducer.recordingList
  );
  const [callRecordingData, setCallRecordingData] = useState(null);
  const [callRecordingInfo, setCallRecordingInfo] = useState(null);
  const [recordingStatus, setRecordingStatus] = useState("");

  const checkAuth = useCallback(
    async (user) => {
      if (user) {
        console.log("Supabase user is: ", user);
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
        if (!subscriptionResponse) {
          setIsSubscribed(false);
          setSubscriptionInfo(null);
        } else {
          if (!subscriptionResponse.data[0]) {
            setIsSubscribed(false);
            setSubscriptionInfo(null);
          } else {
            console.log(
              "subscriptionResponse is: ",
              subscriptionResponse.data[0].stripe_product_name
            );
            setIsSubscribed(true);
            setSubscriptionInfo(
              subscriptionResponse.data[0].stripe_product_name
            );
          }
        }
      } else {
        // User is signed out
        console.log(
          "The user is inauthenticated, redirecting back to signin page"
        );
        router.push("/signin");
      }
    },
    [router]
  );

  useEffect(() => {
    //console.log("Current user is: ", currentUser);
    checkAuth(user);
    //getSubscriptionsInfo();
  }, [checkAuth, user]);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WSS_URL;
    let ws = new WebSocket(wsUrl);
    let keepAliveInterval;

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
      keepAliveInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: "ping" }));
        }
      }, 20 * 1000); // Send every 20 seconds
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
      if (data.event === "update_recording_status") {
        const result = data.result;
        console.log("currentRecording", result);
        setCallRecordingInfo(result);
        setRecordingStatus(result?.recordingStatus);
      }
    };

    // Cleanup function to close WebSocket and clear intervals when component unmounts
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
      }
    };
  }, []); // Empty dependency array means this runs once when component mounts

  const dialNumber = async () => {
    try {
      console.log("phoneNumber is: ", phoneNumber);
      if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
        alert("Invalid phone number!");
        return;
      }

      if (!customer || !customer.id) {
        alert("Please wait for customer data to load");
        return;
      }

      // call the "dial" API endpoint
      const to = phoneNumber;
      const res_dial = await axios.get(
        `/api/dialTwilio?to=${encodeURIComponent(to)}&customer_id=${
          customer.id
        }`
      );
      setRecordingStatus("Recording In Progress...");
      if (res_dial) {
        console.log("res_dial full response: ", res_dial);
      }
    } catch (error) {
      console.error(
        "Error making call:",
        error.response?.data || error.message
      );
      alert(
        "Failed to make call: " + (error.response?.data?.error || error.message)
      );
    }
  };

  function renderView() {
    if (isSubscribed) {
      if (recordingStatus) {
        return (
          <div className="title">
            <div
              style={{
                color: "green",
              }}
            >
              {recordingStatus?.toLocaleUpperCase()}
            </div>
            {recordingStatus === "completed" && (
              <div>
                <span>Recording Url: {callRecordingInfo.recordingUrl}</span>
                <div>
                  <a href={callRecordingInfo.recordingUrl}>Open Url</a>
                </div>
              </div>
            )}

            {transcriptionText && (
              <div className="title">
                <p>{transcriptionText}</p>
              </div>
            )}
          </div>
        );
      } else {
        return (
          <div>
            <button onClick={dialNumber}>Dial Number</button>
            <PhoneInput
              placeholder="Enter phone number with country code"
              value={phoneNumber}
              onChange={setPhoneNumber}
            />
          </div>
        );
      }
    } else {
      return (
        <>
          <h1> You are not subscribed!!</h1>
        </>
      );
    }
  }

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "40px auto",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ marginBottom: "20px", color: "#333" }}>Phone Recording</h1>
      {renderView()}
      <style jsx global>{`
        .PhoneInput {
          margin: 20px 0;
        }
        button {
          background: #0070f3;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          margin: 10px 0;
        }
        button:hover {
          background: #0051cc;
        }
        .title {
          background: #f0f0f0;
          padding: 20px;
          border-radius: 5px;
          margin-top: 20px;
        }
      `}</style>
    </div>
  );
};

export default PhoneRecording2;
