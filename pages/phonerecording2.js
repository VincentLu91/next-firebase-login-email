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
  const [filename, setFilename] = React.useState("");
  const [numCalls, setNumCalls] = React.useState(0);

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

  const getNumCalls = useCallback(
    async (user) => {
      let tokenResponse = await supabase
        .from("customers")
        .select("*")
        .eq("email_address", user?.email);
      setNumCalls(tokenResponse?.data[0]?.num_calls);
    },
    [setNumCalls]
  );

  useEffect(() => {
    getNumCalls(user);
  }, [getNumCalls, user]);

  useEffect(() => {
    if (!customer) return;
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

    ws.onmessage = async function (msg) {
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

        // Call the API when recording is complete
        if (result?.recordingStatus === "completed") {
          try {
            console.log("customer object should be: ", customer?.id);
            if (customer?.id) {
              const response = await axios.get(
                `/api/calls-token?user=${customer?.id}`
              );
              console.log("Calls token response:", response.data);
              setNumCalls(response.data?.data[0]?.num_calls);
            }
          } catch (error) {
            console.error("Error calling /api/calls-token:", error);
          }
        }
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
  }, [customer]); // Empty dependency array means this runs once when component mounts

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

  function addDurationToTimestamp(timestamp, durationInSeconds) {
    const date = new Date(timestamp);
    const newDate = new Date(date.getTime() + durationInSeconds * 1000);
    return newDate.toUTCString();
  }

  async function renameRecord() {
    if (!filename && filename.length < 1) {
      alert("Filename can not be empty!");
      return;
    }

    try {
      // Download the audio file from Twilio URL
      const response = await fetch(callRecordingInfo.recordingUrl);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      // Generate unique filename
      const file_name = `${filename}_${customer.id}_${Date.now()}.mp3`;

      // Upload to Supabase storage
      const blobResponse = await supabase.storage
        .from("recreate-ai-storage-bucket")
        .upload(file_name, arrayBuffer, {
          contentType: "audio/mp3",
        });

      if (blobResponse.error) {
        console.error("Storage upload error:", blobResponse.error);
        alert("Failed to upload recording");
        return;
      }

      setCallRecordingData(undefined);
      const durationMillis = callRecordingInfo.recordingDuration * 1000;
      const momentduration = moment.duration(durationMillis);
      let duration = moment
        .utc(momentduration.as("milliseconds"))
        .format("HH:mm:ss");
      if (momentduration.hours() === 0) {
        duration = moment
          .utc(momentduration.as("milliseconds"))
          .format("mm:ss");
      }
      const recordingdate = moment(callRecordingInfo.recordingStartTime).format(
        "MMMM Do YYYY"
      );
      const newRecordingList = [...recordingList];
      newRecordingList.push({
        filepath: callRecordingInfo.recordingUrl,
        filename,
        recordingdate: recordingdate,
        duration: duration,
        transcript: transcriptionText,
      });

      dispatch(updateRecordingList(newRecordingList));
      console.log("In Phone Recording, currentUser is: ", customer);
      console.log(
        "In Phone Recording, newRecordingList is: ",
        newRecordingList
      );

      const RecordingEndTime = addDurationToTimestamp(
        callRecordingInfo.recordingStartTime,
        callRecordingInfo.recordingDuration
      );

      const insertCallResponse = await supabase
        .from("call_recordings")
        .insert([
          {
            telnyx_call_control_id: callRecordingInfo.callSid,
            file_name: filename,
            duration,
            full_transcript: transcriptionText,
            customer_id: customer.id,
            recording_id: callRecordingInfo.recordingSid,
            original_file_name: file_name, // Use the new Supabase storage filename
            durationMillis,
            start_time: callRecordingInfo.recordingStartTime,
            end_time: RecordingEndTime,
            react_native_event: callRecordingInfo.recordingStatus,
          },
        ])
        .select();

      if (insertCallResponse.error) {
        console.log(insertCallResponse.error);
        throw new Error("Failed to save recording information");
      }

      setFilename("");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error processing recording:", error);
      alert("Failed to process recording: " + error.message);
    }
  }

  function renderView() {
    if (isSubscribed) {
      if (numCalls == 0) {
        return (
          <div className="title">
            <h2>You have no calls available!</h2>
          </div>
        );
      } else {
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
              <h2>Number of calls available: {numCalls}</h2>
              {recordingStatus === "completed" && (
                <div>
                  <span>Recording Url: {callRecordingInfo.recordingUrl}</span>
                  <div>
                    <a href={callRecordingInfo.recordingUrl}>Open Url</a>
                  </div>
                  <input
                    value={filename}
                    name="filename"
                    onChange={(e) => setFilename(e.target.value)}
                  />
                  <button onClick={renameRecord}>Rename</button>
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
              <h2>Number of calls available: {numCalls}</h2>
              <button onClick={dialNumber}>Dial Number</button>
              <PhoneInput
                placeholder="Enter phone number with country code"
                value={phoneNumber}
                onChange={setPhoneNumber}
              />
            </div>
          );
        }
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
