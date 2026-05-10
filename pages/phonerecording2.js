import * as React from "react";
import { useEffect, useCallback, useState } from "react";
import axios from "axios";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { isValidPhoneNumber } from "react-phone-number-input";
import { useProtectedPage } from "../utils/auth-helpers";
import { useRouter } from "next/router";
import { supabase } from "../utils/initSupabase";
import {
  updateRecordingList,
  setCallControlID,
  setSound,
} from "../redux/recording/actions";
import moment from "moment";
import Link from "next/link";

import { useDispatch, useSelector } from "react-redux";
import LiveAskBox from "../components/LiveAskBox";
/* === STYLE: same look as Recording.js (no logic changes) === */
const phoneRecordingStyles = `
:root{

 --bg:#1f2030;
 --panel:#2b2c41;
 --muted:#aaa8bd;
 --text:#f6f2fb;

 --primary:#4235e8;
 --primary-600:#382ed2;
 --danger:#ef4444;
 --danger-600:#dc2626;

 --ring:rgba(167,132,255,.35);
 --shadow:none;

 --radius:28px;
 --radius-sm:18px;

}
.rec-wrap{min-height:calc(100vh - 80px);background:var(--bg);padding:48px 20px 80px;color:var(--text);}
.headline{font-size:18px;font-weight:600;letter-spacing:.2px;opacity:.9;text-align:center;margin:0 0 18px;}
.rec-card{width:100%;max-width:860px;margin:0 auto;background:var(--panel);border:1px solid rgba(255,255,255,.08);border-radius:var(--radius);padding:18px;box-shadow:var(--shadow);}
.rec-row{
 display:flex;
 align-items:center;
 justify-content:space-between;
 gap:14px;
 flex-wrap:wrap;
}

.status,
.chip{
 display:inline-flex;
 align-items:center;
 gap:8px;
 padding:10px 14px;
 border-radius:999px;
 font-size:13px;
 font-weight:700;
 border:1px solid rgba(255,255,255,.09);
 background:rgba(255,255,255,.055);
 color:var(--muted);
}

.status{
 text-transform:capitalize;
}

.status.idle{
 color:var(--text);
}

.status.recording{
 color:#f6b65b;
}

.status.completed{
 color:#7ee0a3;
}

.dot{
 width:10px;
 height:10px;
 border-radius:50%;
 background:currentColor;
 box-shadow:0 0 0 3px rgba(255,255,255,.06) inset;
}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(239,68,68,.7);transform:scale(1);}70%{box-shadow:0 0 0 10px rgba(239,68,68,0);transform:scale(1.05);}100%{box-shadow:0 0 0 0 rgba(239,68,68,0);transform:scale(1);}}
.status.recording .dot{background:var(--danger);animation:pulse 1.5s infinite;}
.btn{appearance:none;border:0;border-radius:12px;padding:12px 18px;font-weight:600;letter-spacing:.2px;cursor:pointer;transition:transform .16s ease,background .2s ease,box-shadow .2s ease;box-shadow:0 6px 14px rgba(0,0,0,.25);color:#fff;}
.btn:hover{transform:translateY(-1px);} .btn:focus-visible{outline:0;box-shadow:0 0 0 4px var(--ring),0 6px 14px rgba(0,0,0,.25);}
.btn-primary{background:var(--primary);} .btn-primary:hover{background:var(--primary-600);}
.btn-danger{background:var(--danger);} .btn-danger:hover{background:var(--danger-600);}
.btn-ghost{border:1px solid rgba(255,255,255,.1);background:transparent;color:var(--text);padding:10px 14px;border-radius:var(--radius-sm);font-weight:500;}
.btn-ghost:hover{background:rgba(255,255,255,.04);}
.field{
 display:flex;
 gap:10px;
 align-items:center;
 margin-top:18px;
 width:100%;
}

.field input[type="text"]{
 flex:1;
 min-width:240px;
 background:#35364c;
 color:var(--text);
 border:1px solid rgba(255,255,255,.09);
 padding:14px 16px;
 border-radius:18px;
 outline:0;
}

.field input[type="text"]:focus{
 border-color:rgba(167,132,255,.65);
 box-shadow:0 0 0 4px var(--ring);
}

.transcript{
 margin-top:18px;
 padding:18px;
 background:rgba(255,255,255,.03);
 border:1px solid rgba(255,255,255,.08);
 border-radius:var(--radius-sm);
 max-height:42vh;
 overflow:auto;
 line-height:1.6;
 font-size:16px;
}

.PhoneInput{
 display:flex;
 align-items:center;
 gap:10px;
 background:#35364c;
 border:1px solid rgba(255,255,255,.09);
 border-radius:18px;
 padding:14px 16px;
 max-width:420px;
 width:100%;
 box-sizing:border-box;
}

.PhoneInput input{
 flex:1;
 background:transparent;
 border:0;
 outline:0;
 color:var(--text);
 font-size:16px;
}

.PhoneInput input::placeholder{
 color:rgba(246,242,251,.55);
}

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

/* Buy Credits Button */
.buyCreditsBtn {
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid rgba(123, 92, 255, 0.3);
  background: linear-gradient(to right, #7b5cff, #985cff);
  color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  margin-bottom: 20px;
}
.buyCreditsBtn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(123, 92, 255, 0.4);
}

/* === END HOTFIX === */
`;

const ASSEMBLY_AI_KEY =
  process.env.ASSEMBLY_AI_KEY || "8acedd22ef7542259df0f36dc8bf18ac";

const PhoneRecording2 = () => {
  const {
    user,
    customer: authCustomer,
    loading,
    supabase: supabaseClient,
  } = useProtectedPage();
  const [transcriptionText, setTranscriptionText] = useState("");
  const [askLiveState, setAskLiveState] = React.useState({
    question: "",
    answer: "",
    error: "",
  });
  const [phoneNumber, setPhoneNumber] = React.useState(null);
  const customer = authCustomer; // Use customer from auth helper
  const router = useRouter();
  const dispatch = useDispatch();
  const recordingList = useSelector(
    (state) => state.recordingReducer.recordingList,
  );
  const [callRecordingData, setCallRecordingData] = useState(null);
  const [callRecordingInfo, setCallRecordingInfo] = useState(null);
  const [recordingStatus, setRecordingStatus] = useState("");
  const [filename, setFilename] = React.useState("");
  const [numCalls, setNumCalls] = React.useState(0);
  const [hasSubscription, setHasSubscription] = React.useState(false);
  const callCreditDeductedRef = React.useRef(false);

  const getNumCalls = useCallback(
    async (user) => {
      if (!user?.id) {
        setNumCalls(0);
        setHasSubscription(false);
        return;
      }

      const { data: entitlement, error: entitlementError } = await supabase
        .from("customers")
        .select("id, num_calls")
        .eq("id", user.id)
        .maybeSingle();

      if (entitlementError || !entitlement) {
        console.log("No call entitlement found for user:", user.id);
        setNumCalls(0);
        setHasSubscription(false);
        return;
      }

      setNumCalls(entitlement.num_calls ?? 0);

      const { data: subscriptionData, error: subError } = await supabase
        .from("subscriptions")
        .select("cancel_at_period_end")
        .eq("customer_id", user.id)
        .maybeSingle();

      if (subError || !subscriptionData) {
        console.log("No active subscription row found for user:", user.id);
        setHasSubscription(false);
        return;
      }

      const isActive = subscriptionData.cancel_at_period_end === false;
      setHasSubscription(isActive);
    },
    [setNumCalls],
  );

  useEffect(() => {
    getNumCalls(user);
  }, [getNumCalls, user]);

  useEffect(() => {
    if (!user?.id) return;
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
        const statusText = (result?.recordingStatus || "").toLowerCase();

        const isCompletedStatus =
          statusText.includes("completed") ||
          statusText.includes("complete") ||
          Boolean(result?.recordingUrl);

        // Call the API when recording is complete
        if (isCompletedStatus && !callCreditDeductedRef.current) {
          callCreditDeductedRef.current = true;
          try {
            console.log("deducting call token for user: ", user?.id);

            const tokenOwnerId = user?.id;

            if (tokenOwnerId) {
              const response = await axios.get(
                `/api/calls-token?user_id=${tokenOwnerId}`,
              );

              console.log("Calls token response:", response.data);
              setNumCalls(response.data?.num_calls ?? 0);
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
  }, [user?.id]); // Empty dependency array means this runs once when component mounts

  const dialNumber = async () => {
    try {
      console.log("phoneNumber is: ", phoneNumber);
      if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
        alert("Invalid phone number!");
        return;
      }

      if (!user || !user.id) {
        alert("Please wait for user data to load");
        return;
      }

      setAskLiveState({
        question: "",
        answer: "",
        error: "",
      });
      callCreditDeductedRef.current = false;

      // call the "dial" API endpoint
      const to = phoneNumber;
      const res_dial = await axios.get(
        `/api/dialTwilio?to=${encodeURIComponent(to)}&user_id=${customer.id}`,
      );
      setRecordingStatus("Recording In Progress...");
      if (res_dial) {
        console.log("res_dial full response: ", res_dial);
      }
    } catch (error) {
      console.error(
        "Error making call:",
        error.response?.data || error.message,
      );
      alert(
        "Failed to make call: " +
          (error.response?.data?.error || error.message),
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
        "MMMM Do YYYY",
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
        newRecordingList,
      );

      const RecordingEndTime = addDurationToTimestamp(
        callRecordingInfo.recordingStartTime,
        callRecordingInfo.recordingDuration,
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
        .select()
        .single();

      if (insertCallResponse.error) {
        console.log(insertCallResponse.error);
        throw new Error("Failed to save recording information");
      }

      // Set the saved recording in Redux so audioplayer can access it
      dispatch(setSound(insertCallResponse.data));

      setFilename("");

      // Navigate to audioplayer instead of dashboard
      router.push("/audioplayer");
    } catch (error) {
      console.error("Error processing recording:", error);
      alert("Failed to process recording: " + error.message);
    }
  }

  function renderView() {
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

        const isCompleted =
          s.includes("completed") ||
          s.includes("complete") ||
          Boolean(callRecordingInfo?.recordingUrl);

        const tone = isCompleted ? "completed" : "recording";

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

            {isCompleted && (
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
              <>
                <div
                  className="transcript"
                  aria-live="polite"
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {transcriptionText}
                </div>

                <LiveAskBox
                  contextText={transcriptionText.trim()}
                  placeholder="Ask about this call..."
                  askLiveState={askLiveState}
                  setAskLiveState={setAskLiveState}
                  metadata={{
                    user_id: user?.id,
                    userId: user?.id,
                    soundUrl: `live-phone-${user?.id || "anonymous"}`,
                    recording_type: "call",
                  }}
                />
              </>
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
  }

  return (
    <div className="rec-wrap">
      <h2 className="headline">Phone Call Recording</h2>
      <h2 className="headline">Each recording session lasts up to 5 minutes</h2>

      {hasSubscription && numCalls <= 2 && (
        <Link href="/buy-credits">
          <button className="buyCreditsBtn">💳 Buy Credits</button>
        </Link>
      )}

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
