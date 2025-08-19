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
/* === STYLE: same look as Recording.js (no logic changes) === */
const phoneRecordingStyles = `
:root{
  --bg:#0b0d12; --panel:#11151d; --muted:#a0a8b8; --text:#e6e8ef;
  --primary:#2563eb; --primary-600:#1d4ed8; --danger:#ef4444; --danger-600:#dc2626;
  --ring:rgba(37,99,235,.45); --shadow:0 10px 20px rgba(0,0,0,.25);
  --radius:14px; --radius-sm:10px;
}
.rec-wrap{min-height:calc(100vh - 80px);background:var(--bg);padding:48px 20px 80px;color:var(--text);}
.headline{font-size:18px;font-weight:600;letter-spacing:.2px;opacity:.9;text-align:center;margin:0 0 18px;}
.rec-card{width:100%;max-width:860px;margin:0 auto;background:var(--panel);border:1px solid rgba(255,255,255,.08);border-radius:var(--radius);padding:18px;box-shadow:var(--shadow);}
.rec-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.status,.chip{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;font-size:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:var(--muted);}
.status{text-transform:capitalize;}
.status.idle{color:var(--muted);} .status.recording{color:#f59e0b;} .status.completed{color:#10b981;}
.dot{width:10px;height:10px;border-radius:50%;background:currentColor;box-shadow:0 0 0 3px rgba(255,255,255,.05) inset;}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(239,68,68,.7);transform:scale(1);}70%{box-shadow:0 0 0 10px rgba(239,68,68,0);transform:scale(1.05);}100%{box-shadow:0 0 0 0 rgba(239,68,68,0);transform:scale(1);}}
.status.recording .dot{background:var(--danger);animation:pulse 1.5s infinite;}
.btn{appearance:none;border:0;border-radius:12px;padding:12px 18px;font-weight:600;letter-spacing:.2px;cursor:pointer;transition:transform .16s ease,background .2s ease,box-shadow .2s ease;box-shadow:0 6px 14px rgba(0,0,0,.25);color:#fff;}
.btn:hover{transform:translateY(-1px);} .btn:focus-visible{outline:0;box-shadow:0 0 0 4px var(--ring),0 6px 14px rgba(0,0,0,.25);}
.btn-primary{background:var(--primary);} .btn-primary:hover{background:var(--primary-600);}
.btn-danger{background:var(--danger);} .btn-danger:hover{background:var(--danger-600);}
.btn-ghost{border:1px solid rgba(255,255,255,.1);background:transparent;color:var(--text);padding:10px 14px;border-radius:var(--radius-sm);font-weight:500;}
.btn-ghost:hover{background:rgba(255,255,255,.04);}
.field{display:flex;gap:10px;align-items:center;margin-top:14px;width:100%;}
.field input[type="text"]{flex:1;min-width:240px;background:rgba(255,255,255,.06);color:var(--text);border:1px solid rgba(255,255,255,.12);padding:12px 14px;border-radius:var(--radius-sm);outline:0;}
.field input[type="text"]:focus{border-color:var(--primary);box-shadow:0 0 0 4px var(--ring);}
.transcript{margin-top:18px;padding:18px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:var(--radius-sm);max-height:42vh;overflow:auto;line-height:1.6;font-size:16px;}
.PhoneInput{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:var(--radius-sm);padding:8px 10px;max-width:420px;width:100%;}
.PhoneInput input{flex:1;background:transparent;border:0;outline:0;color:var(--text);font-size:16px;}
.PhoneInput input::placeholder{color:rgba(230,232,239,.55);}

/* === INTERACTION HOTFIX: ensure inputs & buttons stay clickable === */
.rec-wrap,
.rec-card {
  position: relative; /* establish stacking context for overlays */
}

/* Any decorative overlays (tints, gradients, shimmer) must not capture clicks */
.rec-card::before,
.rec-wrap::before,
.rec-row::before,
.sticky-footer::before,
.sticky-footer::after {
  pointer-events: none !important;
  z-index: 0 !important;
}

/* Interactive elements sit above any overlays */
.field,
.PhoneInput,
.btn,
.btn-ghost,
.btn-primary,
input,
textarea,
select,
a {
  position: relative;
  z-index: 1;
  pointer-events: auto !important;
}

/* Do NOT "disable" via pointer-events; use the HTML disabled attribute instead */
.btn[disabled],
button[disabled],
.btn:disabled {
  opacity: .6;
  cursor: not-allowed;
  pointer-events: auto; /* keep focus/tooltip available */
}

/* If you use a state tint overlay, keep it behind content */
.state-tint,
.gradient-overlay {
  pointer-events: none !important;
  z-index: 0 !important;
}

/* styled-jsx: ensure 3rd-party PhoneInput remains interactive */
:global(.PhoneInput) { pointer-events: auto; }
:global(.PhoneInput input) { pointer-events: auto; }

/* OPTIONAL: if you add a recording/completed tint via ::before, keep it click-through */
.rec-card.is-recording::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(245, 158, 11, 0.05); /* subtle amber tint */
  opacity: 1;
  transition: opacity 200ms ease;
  pointer-events: none; /* critical: never block clicks */
  z-index: 0;           /* behind content */
}
.rec-card.is-completed::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(16, 185, 129, 0.05); /* subtle green tint */
  opacity: 1;
  transition: opacity 200ms ease;
  pointer-events: none;
  z-index: 0;
}

/* Keep existing hover/focus styles as-is */

/* === END HOTFIX === */
`;

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
        // ── No calls left
        return (
          <div className="rec-card">
            <div className="rec-row">
              <div className="status idle">
                <span className="dot" /> Ready to dial
              </div>
              <div className="meta">
                <span className="chip">Calls left: 0</span>
              </div>
            </div>

            <h2 className="headline" style={{ marginTop: 12 }}>
              You have no calls available!
            </h2>
          </div>
        );
      } else {
        if (recordingStatus) {
          // ── Status present (in-progress or completed)
          const s = (recordingStatus || "").toLowerCase();
          const tone = s === "completed" ? "completed" : "recording";

          return (
            <div className="rec-card">
              <div className="rec-row">
                <div className={`status ${tone}`}>
                  <span className="dot" />
                  <span>{recordingStatus?.toLocaleUpperCase()}</span>
                </div>
                <div className="meta">
                  <span className="chip">Calls left: {numCalls}</span>
                </div>
              </div>

              {recordingStatus === "completed" && (
                <div className="field" style={{ marginTop: 14 }}>
                  <div>
                    <span className="chip" style={{ borderRadius: 10 }}>
                      Recording Url:
                    </span>
                    <div style={{ marginTop: 8 }}>
                      <a
                        className="btn-ghost"
                        href={callRecordingInfo.recordingUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open Url
                      </a>
                    </div>
                  </div>

                  <input
                    value={filename}
                    name="filename"
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="Rename filename"
                  />
                  <button className="btn btn-primary" onClick={renameRecord}>
                    Rename
                  </button>
                </div>
              )}

              {transcriptionText && (
                <div
                  className="transcript"
                  aria-live="polite"
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {transcriptionText}
                </div>
              )}
            </div>
          );
        } else {
          // ── Ready to dial
          return (
            <div className="rec-card">
              <div className="rec-row">
                <div className="status idle">
                  <span className="dot" /> Ready to dial
                </div>
                <div className="meta">
                  <span className="chip">Calls left: {numCalls}</span>
                </div>
                <button className="btn btn-primary" onClick={dialNumber}>
                  Dial Number
                </button>
              </div>

              <div className="field">
                <PhoneInput
                  placeholder="Enter phone number with country code"
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                />
              </div>
            </div>
          );
        }
      }
    } else {
      // ── Not subscribed
      return (
        <div className="rec-card">
          <div className="rec-row">
            <div className="status idle">
              <span className="dot" /> Locked
            </div>
          </div>
          <h2 className="headline" style={{ marginTop: 12 }}>
            You are not subscribed!!
          </h2>
        </div>
      );
    }
  }

  return (
    <div className="rec-wrap">
      <h2 className="headline">Phone Call Recording</h2>
      <div className="rec-card">
        <div
          style={{
            maxWidth: "600px",
            margin: "40px auto",
            padding: "20px",
            fontFamily: "Arial, sans-serif",
          }}
        >
          {renderView()}
          <style jsx>{phoneRecordingStyles}</style>
        </div>
      </div>
    </div>
  );
};

export default PhoneRecording2;
