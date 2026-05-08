// components/Recording.js
import { useReactMediaRecorder } from "react-media-recorder";
// keep it at 1.6.5: https://github.com/DeltaCircuit/react-media-recorder/issues/98
import * as React from "react";
import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  updateRecordingList,
  setRecordURI,
  setSound,
} from "../redux/recording/actions";
import moment from "moment";
import getBlobDuration from "get-blob-duration";
import RecordRTC, { StereoAudioRecorder } from "recordrtc"; // only run on the browser
import { useRouter } from "next/router";
import { useUser } from "../utils/supabase-hooks";
import fileToArrayBuffer from "file2arraybuffer";
import axios from "axios";
import { supabase } from "../utils/initSupabase";
import { storeAsMp3 } from "../utils/storeAsMp3";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import Link from "next/link";
import LiveAskBox from "./LiveAskBox";

// --- MP3 transcode (browser-only) ---
let _ffmpeg; // singleton
let _ffmpegLoading = null;

// Dev helper: reset the cached ffmpeg instance
export function resetFFmpeg() {
  try {
    _ffmpeg?.terminate?.();
  } catch {}
  try {
    _ffmpeg?.exit?.();
  } catch {}
  _ffmpeg = undefined;
  _ffmpegLoading = null;
}

if (typeof window !== "undefined") {
  // quick access from the DevTools console
  window.__resetFFmpeg = resetFFmpeg;
}

async function ensureFFmpeg() {
  if (typeof window === "undefined") return null; // SSR guard
  if (_ffmpeg) return _ffmpeg;
  if (_ffmpegLoading) return _ffmpegLoading;

  _ffmpegLoading = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const ffmpeg = new FFmpeg();

    // helpful logs while we verify mt vs core
    ffmpeg.on("log", ({ message }) => console.debug("[ffmpeg]", message));

    async function loadVariant(subdir /* 'core' | 'core-mt' */) {
      const { toBlobURL } = await import("@ffmpeg/util"); // dynamic import = SSR safe
      const base = `/ffmpeg/${subdir}`; // served from /public

      const loadOpts = {
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(
          `${base}/ffmpeg-core.wasm`,
          "application/wasm",
        ),
      };

      if (subdir === "core-mt") {
        loadOpts.workerURL = await toBlobURL(
          `${base}/ffmpeg-core.worker.js`,
          "text/javascript",
        );
      }

      await ffmpeg.load(loadOpts);
      console.log(
        `[ffmpeg] iso:${window.crossOriginIsolated} | using: ${subdir}`,
      );
    }

    try {
      // Force core-mt and let it fail if not supported
      await loadVariant("core-mt");
      console.log("[ffmpeg] Successfully loaded core-mt");
    } catch (e) {
      console.warn("[ffmpeg] mt load failed:", e);
      throw new Error("core-mt is required for optimal performance");
    }

    _ffmpeg = ffmpeg;
    return ffmpeg;
  })();

  return _ffmpegLoading;
}

async function wavBlobToMp3(
  wavBlob,
  { bitrate = "128k", outName = "out.mp3" } = {},
) {
  const ffmpeg = await ensureFFmpeg();
  if (!ffmpeg) throw new Error("FFmpeg not available (SSR?)");

  // Unique temp names to avoid collisions across runs
  const stamp = Date.now();
  const inName = `input_${stamp}.wav`;
  const outTmp = `out_${stamp}.mp3`;

  // Write input
  const bytes = new Uint8Array(await wavBlob.arrayBuffer());
  await ffmpeg.writeFile(inName, bytes);

  try {
    // Encode MP3 (stereo, 44.1kHz, target bitrate)
    await ffmpeg.exec([
      "-i",
      inName,
      "-vn", // No video
      "-ar",
      "44100", // Audio rate
      "-ac",
      "2", // Stereo
      "-b:a",
      bitrate, // Bitrate
      "-c:a",
      "libmp3lame", // Force MP3 codec
      "-joint_stereo",
      "1", // Use joint stereo
      "-compression_level",
      "0", // Fast encoding
      "-application",
      "audio", // Audio-optimized encoding
      "-cutoff",
      "18000", // Limit frequency range
      "-write_xing",
      "1", // Write MP3 headers
      "-id3v2_version",
      "3", // Add ID3 tags
      "-f",
      "mp3", // Force MP3 format
      outTmp,
    ]);

    // Read output & return as Blob
    const mp3Data = await ffmpeg.readFile(outTmp);
    return new Blob([mp3Data.buffer], { type: "audio/mpeg" });
  } finally {
    // Best-effort cleanup (supported in @ffmpeg/ffmpeg >= 0.12)
    try {
      ffmpeg.deleteFile && (await ffmpeg.deleteFile(inName));
    } catch {}
    try {
      ffmpeg.deleteFile && (await ffmpeg.deleteFile(outTmp));
    } catch {}
  }
}

const recordingStyles = `
:root {
  --bg: var(--bg-900);
  --panel: var(--bg-800);
  --muted: var(--text-300);
  --text: var(--text-100);

  --primary: var(--accent-400);
  --primary-600: var(--accent-500);

  --danger-rec: #ef4444;
  --danger-600: #dc2626;

  --ring: var(--focus);
  --shadow: 0 10px 24px rgba(0, 0, 0, 0.22);

  --radius: var(--radius-card);
  --radius-sm: var(--radius-input);
  --gap: 20px;
}

/* Page shell */
.rec-wrap {
display: flex;
flex-direction: column;
gap: var(--gap);
align-items: center;
justify-content: flex-start;
min-height: 70vh;
padding: 40px 20px 80px;
background: var(--bg);
color: var(--text);
}

.headline {
font-size: 18px;
font-weight: 600;
letter-spacing: .2px;
opacity: .9;
text-align: center;
}

.backbar {
display: flex;
justify-content: center;
}

/* Ghost button for back */
.btn-ghost {
appearance: none;
border: 1px solid rgba(255,255,255,.1);
background: transparent;
color: var(--text);
padding: 10px 14px;
border-radius: var(--radius-sm);
font-weight: 500;
cursor: pointer;
transition: transform .14s ease, background .2s ease, border-color .2s ease;
}
.btn-ghost:hover { background: rgba(255,255,255,.06); transform: translateY(-1px); }
.btn-ghost:focus-visible { outline: 0; box-shadow: 0 0 0 4px var(--ring); }
.btn-ghost:active { transform: translateY(0); }

/* Card */
.rec-card {
width: 100%;
max-width: 860px;
background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0)) , var(--panel);
border: 1px solid rgba(255,255,255,.08);
border-radius: var(--radius);
padding: 28px;
box-shadow: var(--shadow);
}

.rec-row {
display: flex;
align-items: center;
justify-content: space-between;
gap: var(--gap);
flex-wrap: wrap;
}

.meta {
display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
}

.chip, .status {
display: inline-flex; align-items: center; gap: 8px;
padding: 8px 12px;
border-radius: 999px;
font-size: 12px;
letter-spacing: .2px;
border: 1px solid rgba(255,255,255,.1);
background: rgba(255,255,255,.04);
color: var(--muted);
}

.status.recording .dot {
width: 10px; height: 10px; border-radius: 50%;
background: var(--danger-rec);
box-shadow: 0 0 0 0 rgba(239,68,68,.7);
animation: pulse 1.2s ease-in-out infinite;
}
.status.idle .dot {
width: 10px; height: 10px; border-radius: 50%;
background: rgba(255,255,255,.25);
}
@keyframes pulse {
0% { box-shadow: 0 0 0 0 rgba(239,68,68,.7); transform: scale(1); }
70% { box-shadow: 0 0 0 10px rgba(239,68,68,0); transform: scale(1.05); }
100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); transform: scale(1); }
}

/* Buttons */
.btn {
appearance: none;
border: none;
border-radius: 12px;
padding: 12px 18px;
font-weight: 600;
letter-spacing: .2px;
cursor: pointer;
transition: transform .16s ease, box-shadow .2s ease, background .2s ease, opacity .2s ease;
box-shadow: 0 6px 14px rgba(0,0,0,.25);
color: #fff;
}
.btn:focus-visible { outline: 0; box-shadow: 0 0 0 4px var(--ring), 0 6px 14px rgba(0,0,0,.25); }
.btn:hover { transform: translateY(-1px); }
.btn:active { transform: translateY(0); }

.btn-primary { background: var(--primary); }
.btn-primary:hover { background: var(--primary-600); }

.btn-danger { background: var(--danger-rec); }
.btn-danger:hover { background: var(--danger-600); }

/* Transcript panel */
.transcript {
margin-top: 18px;
padding: 18px;
background: rgba(255,255,255,.03);
border: 1px solid rgba(255,255,255,.08);
border-radius: var(--radius-sm);
max-height: 42vh;
overflow: auto;
line-height: 1.6;
font-size: 18px;
scrollbar-width: thin;
white-space: pre-line;
}

/* Inputs (rename, etc.) */
.field {
display: flex; gap: 10px; align-items: center; margin-top: 14px;
}
.field input {
width: 260px; max-width: 100%;
background: rgba(255,255,255,.06);
color: var(--text);
border: 1px solid rgba(255,255,255,.12);
padding: 10px 12px; border-radius: 10px;
}
.field input::placeholder { color: #9aa3b2; }

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
`;

const Recording = () => {
  const router = useRouter();
  const user = useUser();
  const [timeDifference, setTimeDifference] = React.useState(0);

  const updateMicTokens = async (newTokens) => {
    try {
      let { data: customerInfo, error: fetchError } = await supabase
        .from("customers")
        .select("id") // id is now a UUID matching auth.user.id
        .eq("email_address", user.email)
        .single();

      if (fetchError) throw fetchError;

      const customerUUID = customerInfo.id;
      const { error: updateError } = await supabase
        .from("customers")
        .update({ mic_tokens: newTokens })
        .eq("id", customerUUID);

      if (updateError) throw updateError;

      setNumMicTokens(newTokens);
      setTimeDifference(newTokens);
    } catch (error) {
      console.error("Error updating mic tokens:", error.message);
    }
  };

  const { status, startRecording, stopRecording, mediaBlobUrl } =
    useReactMediaRecorder({
      audio: true,
      onStart: () => {
        setElapsedTime(0);
        timerRef.current = setInterval(() => {
          setElapsedTime((prevTime) => {
            const newElapsedTime = prevTime + 1;
            const remainingTokens = numMicTokens - newElapsedTime;
            updateMicTokens(remainingTokens);
            return newElapsedTime;
          });
        }, 1000);
      },
      onStop: () => {
        clearInterval(timerRef.current);
      },
    });

  const [filename, setFilename] = React.useState("");
  const [liveTranscript, setLiveTranscript] = React.useState("");
  const [turns, setTurns] = React.useState({}); // { [turn_order]: { text, formatted, speaker } }
  const [transcript, setTranscript] = React.useState("");
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const [time, setTime] = React.useState(0);
  const [numMicTokens, setNumMicTokens] = React.useState(0);
  const [elapsedTime, setElapsedTime] = React.useState(0);
  const [hasSubscription, setHasSubscription] = React.useState(false);
  const timerRef = React.useRef(null);
  const intervalIdRef = React.useRef(null);
  const dispatch = useDispatch();
  const recordingList = useSelector(
    (state) => state.recordingReducer.recordingList,
  );

  const isRecording = useSelector(
    (state) => state.recordingReducer.isRecording,
  );
  const recordURI = useSelector((state) => state.recordingReducer.recordURI);

  // Keep recorder reference in a ref to persist between renders
  const recorderRef = React.useRef(null);
  const lastAudioChunkAtRef = React.useRef(null);

  const [interim, setInterim] = React.useState("");

  const [askLiveState, setAskLiveState] = React.useState({
    question: "",
    answer: "",
    error: "",
  });

  const transcriptScrollRef = React.useRef(null);

  React.useEffect(() => {
    if (!isTranscribing) return;

    const transcriptEl = transcriptScrollRef.current;
    if (!transcriptEl) return;

    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }, [liveTranscript, interim, isTranscribing]);

  const getNumMicTokens = useCallback(async () => {
    let tokenResponse = await supabase
      .from("customers")
      .select("*")
      .eq("email_address", user?.email);
    setNumMicTokens(tokenResponse?.data[0]?.mic_tokens);
    setTimeDifference(tokenResponse?.data[0]?.mic_tokens);

    // Check if user has an active subscription (not cancelled)
    const customerId = tokenResponse?.data[0]?.id;
    if (customerId) {
      const { data: subscriptionData } = await supabase
        .from("subscriptions")
        .select("cancel_at_period_end")
        .eq("customer_id", customerId)
        .single();

      // Subscription is active if cancel_at_period_end is FALSE
      setHasSubscription(subscriptionData?.cancel_at_period_end === false);
    } else {
      setHasSubscription(false);
    }
  }, [user, setNumMicTokens]);

  useEffect(() => {
    getNumMicTokens();
  }, [getNumMicTokens]);

  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = time % 60;

  const reset = () => {
    setTime(0);
  };

  const uploadAudio = async (audioData) => {
    console.log("Starting uploadAudio with data:", audioData);

    try {
      if (!mediaBlobUrl) throw new Error("No recording to save.");
      if (!audioData?.customer_id) throw new Error("Customer ID is required.");

      // 1) Read the recorded WAV blob
      console.log("Fetching WAV blob...");
      const resp = await fetch(mediaBlobUrl, { cache: "no-store" });
      if (!resp.ok) throw new Error(`Blob fetch failed: ${resp.status}`);
      const wavBlob = await resp.blob();
      console.log("WAV blob fetched successfully");

      // 2) Ensure ffmpeg (multi-thread) is ready and transcode to MP3
      console.log("Starting MP3 conversion...");
      await ensureFFmpeg();
      const base = (audioData.file_name || "recording")
        .toString()
        .trim()
        .replace(/[^\w\-]+/g, "_");
      const stamp = Date.now();
      const mp3Name = `${base}_${audioData.customer_id}_${stamp}.mp3`;

      const mp3Blob = await wavBlobToMp3(wavBlob, {
        bitrate: "128k",
        outName: "out.mp3",
      });
      console.log("MP3 conversion complete");

      // 3) Upload MP3 to Supabase Storage
      console.log("Uploading MP3 to storage...");
      const BUCKET = "recreate-ai-storage-bucket";
      const { data: uploadData, error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(mp3Name, mp3Blob, {
          contentType: "audio/mpeg",
          upsert: false,
          cacheControl: "3600",
        });
      if (upErr) throw new Error(`Failed to upload MP3: ${upErr.message}`);
      console.log("MP3 upload successful:", uploadData);

      // 4) Insert DB row with transcript
      console.log("Saving to database...");
      const row = {
        file_name: audioData.file_name,
        original_file_name: mp3Name,
        full_transcript: transcript || liveTranscript,
        duration: audioData.duration,
        customer_id: audioData.customer_id,
      };
      console.log("Row data:", row);

      const { data, error: dbErr } = await supabase
        .from("mic_recordings")
        .insert([row])
        .select()
        .single();

      if (dbErr) {
        console.error("Database error:", dbErr);
        throw new Error(`Failed to save to database: ${dbErr.message}`);
      }

      console.log("Successfully saved to database:", data);
      return data;
    } catch (e) {
      console.error("uploadAudio error:", e);
      throw e; // Re-throw to handle in renameRecord
    }
  };

  // Store texts in component state to reset between recordings
  const [texts, setTexts] = React.useState({});

  const startRecordingAudio = async () => {
    // Reset state for new recording
    setTexts({});
    setTurns({});
    setLiveTranscript("");
    setInterim("");
    lastAudioChunkAtRef.current = null;
    startRecording();
    setIsTranscribing(true);
    setAskLiveState({
      question: "",
      answer: "",
      error: "",
    });

    // 🔒 Get auth token from Supabase session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      alert("Please login to use recording features");
      setIsTranscribing(false);
      return;
    }

    const response = await fetch("/api/token", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const data = await response.json();
    if (data.error) {
      alert(data.error);
      return;
    }

    const { token } = data;

    if (!window.socket) {
      const params = new URLSearchParams({
        sample_rate: "16000",
        format_turns: "true",
        token,
        speech_model: "u3-rt-pro",
        speaker_labels: true,
      });
      window.socket = new WebSocket(
        `wss://streaming.assemblyai.com/v3/ws?${params}`,
      );
      window.socket.binaryType = "arraybuffer";
    }

    window.socket.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);

        if (data.type === "Error") {
          console.error("AssemblyAI websocket error message:", data);
          return;
        }

        if (data.type === "Begin") return;
        if (data.type === "Turn") {
          const transcript = data.transcript || "";
          const formatted = data.turn_is_formatted;
          const speakerLabel = data.speaker_label; // Extract speaker label (e.g., "A", "B", "C")

          // Show live partial for current utterance
          if (!data.end_of_turn) {
            setInterim(transcript);
            return;
          }

          // Commit on endpoint; prefer formatted if present
          const order = Number(data.turn_order ?? 0);

          setTurns((prev) => {
            const next = { ...prev };
            const curr = next[order];
            // upgrade/insert: if we don't have it yet, or we now have a formatted one
            if (!curr || (formatted && !curr.formatted)) {
              next[order] = {
                text: transcript,
                formatted,
                speaker: speakerLabel,
              };
            }
            // rebuild the display string from ordered turns with speaker labels
            const joined = Object.keys(next)
              .map((k) => Number(k))
              .sort((a, b) => a - b)
              .map((k) => {
                const turn = next[k];
                // Only add speaker label if speaker info exists
                return turn.speaker
                  ? `Speaker ${turn.speaker}: ${turn.text}`
                  : turn.text;
              })
              .join("\n\n")
              .trim();
            setLiveTranscript(joined);
            return next;
          });
          setInterim("");
          return;
        }
        if (data.type === "Termination") return;
      } catch (e) {
        console.warn("onmessage parse error", e);
      }
    };

    window.socket.onerror = (event) => {
      console.error("AssemblyAI socket error:", event);
      setInterim("");

      try {
        window.socket?.send(JSON.stringify({ type: "Terminate" }));
      } catch {}

      try {
        window.socket?.close();
      } catch {}

      window.socket = null;
      setIsTranscribing(false);
    };

    window.socket.onclose = (event) => {
      console.warn("AssemblyAI socket closed:", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });

      window.socket = null;
    };

    window.socket.onopen = (e) => {
      if (e.target.readyState !== WebSocket.OPEN) return;
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          recorderRef.current = new RecordRTC(stream, {
            type: "audio",
            recorderType: StereoAudioRecorder,
            mimeType: "audio/wav",
            numberOfAudioChannels: 1,
            desiredSampRate: 16000,
            // Add timeSlice to get data periodically
            timeSlice: 120,
            // Get data every 120ms
            ondataavailable: (blob) => {
              const now = Date.now();
              const elapsedSinceLastChunk = lastAudioChunkAtRef.current
                ? now - lastAudioChunkAtRef.current
                : 0;

              lastAudioChunkAtRef.current = now;

              if (elapsedSinceLastChunk > 900) {
                console.warn(
                  "Skipping delayed audio chunk to avoid AssemblyAI 3007:",
                  {
                    elapsedSinceLastChunk,
                  },
                );
                return;
              }

              const reader = new FileReader();

              reader.onload = () => {
                const buffer = reader.result;

                if (window.socket?.readyState === WebSocket.OPEN) {
                  window.socket.send(buffer);
                }
              };

              reader.readAsArrayBuffer(blob);
            },
          });

          recorderRef.current.startRecording();
        })
        .catch((err) => console.error(err));
    };
  };

  const stopRecordingAudio = useCallback(async () => {
    if (recorderRef.current) {
      recorderRef.current.stopRecording(() => {
        if (window.socket) {
          try {
            window.socket.send(JSON.stringify({ type: "Terminate" }));
          } catch {}
          setInterim("");
          window.socket.close();
          window.socket = null;
        }
        recorderRef.current = null;
        stopRecording();
        setIsTranscribing(false);
        setTranscript(liveTranscript);
      });
    } else {
      if (window.socket) {
        try {
          window.socket.send(JSON.stringify({ type: "Terminate" }));
        } catch {}
        setInterim("");
        window.socket.close();
        window.socket = null;
      }
      stopRecording();
      setIsTranscribing(false);
      setTranscript(liveTranscript);
    }
  }, [liveTranscript, stopRecording]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (window.socket) {
        try {
          window.socket.send(JSON.stringify({ type: "Terminate" }));
        } catch {}
        setInterim("");
        window.socket.close();
        window.socket = null;
      }
      if (recorderRef.current) {
        recorderRef.current.stopRecording();
        recorderRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isTranscribing && numMicTokens == 0) {
      stopRecordingAudio();
    }
  }, [isTranscribing, numMicTokens, stopRecordingAudio]);

  async function renameRecord() {
    if (!filename || filename.length < 1) {
      alert("Filename can not be empty!");
      return;
    }
    if (!mediaBlobUrl) {
      alert("No recording to save.");
      return;
    }

    try {
      setRecordURI(mediaBlobUrl);

      // duration (mm:ss / HH:mm:ss)
      const seconds = await getBlobDuration(mediaBlobUrl);
      const md = moment.duration(Math.round(seconds * 1000));
      let duration = moment.utc(md.as("milliseconds")).format("HH:mm:ss");
      if (md.hours() === 0)
        duration = moment.utc(md.as("milliseconds")).format("mm:ss");

      if (!user?.email) {
        throw new Error("You must be logged in to save recordings");
      }

      // Get customer ID
      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .select("id") // id is now a UUID matching auth.user.id
        .eq("email_address", user.email)
        .single();

      if (custErr) throw custErr;
      const customerUUID = customer?.id;
      if (!customerUUID) {
        throw new Error(
          "Customer ID not found. Please ensure you have an active subscription.",
        );
      }

      const audioData = {
        customer_id: customerUUID, // UUID from auth.user.id
        file_name: filename,
        duration,
        full_transcript: transcript || liveTranscript, // Use either transcript or liveTranscript
        transcript: transcript || liveTranscript, // Include both for backward compatibility
      };

      console.log("Audio data with transcript:", audioData); // Debug log

      if (typeof reset === "function") reset();

      const savedRecording = await uploadAudio(audioData);

      // Set the saved recording in Redux so audioplayer can access it
      dispatch(setSound(savedRecording));

      setFilename("");
      dispatch(setRecordURI(null));

      // Navigate to audioplayer instead of dashboard
      router.push("/audioplayer");
    } catch (error) {
      console.error("Error processing recording:", error);
      alert("Failed to process recording: " + (error?.message || error));
    }
  }

  function renderView() {
    if (status === "recording" || status === "idle") {
      if (numMicTokens == 0) {
        return (
          <div className="rec-card">
            <div className="rec-row">
              <div className="status idle">
                <span className="dot" /> Idle
              </div>
              <div className="meta">
                <span className="chip">Seconds left: 0</span>
              </div>
            </div>
            <p style={{ marginTop: 10, color: "var(--muted)" }}>
              You have no seconds left.
            </p>
          </div>
        );
      }
      if (isTranscribing) {
        return (
          <div className="rec-card">
            <div className="rec-row">
              <div className={`status ${status}`}>
                <span className="dot" />
                <span style={{ textTransform: "capitalize" }}>{status}</span>
              </div>
              <div className="meta">
                <span className="chip">Seconds left: {numMicTokens}</span>
                <span className="chip">
                  Elapsed: {elapsedTime ?? timeDifference ?? 0}s
                </span>
              </div>
              <button className="btn btn-danger" onClick={stopRecordingAudio}>
                Stop Recording
              </button>
            </div>
            <div
              ref={transcriptScrollRef}
              className="transcript"
              aria-live="polite"
              style={{ whiteSpace: "pre-wrap" }}
            >
              <p>
                {liveTranscript}{" "}
                <span style={{ opacity: 0.55 }}>{interim}</span>
              </p>
            </div>
            <LiveAskBox
              contextText={`${liveTranscript}\n\n${interim}`.trim()}
              disabled={!isTranscribing}
              askLiveState={askLiveState}
              setAskLiveState={setAskLiveState}
            />
          </div>
        );
      } else {
        return (
          <div className="rec-card">
            <div className="rec-row">
              <div className={`status ${status}`}>
                <span className="dot" />
                <span style={{ textTransform: "capitalize" }}>{status}</span>
              </div>
              <div className="meta">
                <span className="chip">Seconds left: {numMicTokens}</span>
              </div>
              <button className="btn btn-primary" onClick={startRecordingAudio}>
                Start Recording
              </button>
            </div>
          </div>
        );
      }
    }
    if (status === "stopped") {
      return (
        <div className="rec-card">
          <div className="field">
            <input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Rename transcript…"
            />
            <button className="btn btn-ghost" onClick={renameRecord}>
              Rename
            </button>
          </div>
          <div className="transcript" style={{ whiteSpace: "pre-wrap" }}>
            {transcript}
          </div>
          <LiveAskBox
            contextText={(transcript || liveTranscript || "").trim()}
            placeholder="Ask about this recording..."
            askLiveState={askLiveState}
            setAskLiveState={setAskLiveState}
          />
        </div>
      );
    }
  }

  return (
    <div className="rec-wrap">
      {/*<div className="backbar">
        <button className="btn-ghost" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </button>
      </div>*/}

      <h2 className="headline">For best results, record audio on Chrome</h2>
      <p>For best results, keep this tab open while recording.</p>

      {hasSubscription && numMicTokens <= 7200 && (
        <Link href="/buy-credits">
          <button className="buyCreditsBtn">💳 Buy Credits</button>
        </Link>
      )}

      {renderView()}

      <style jsx>{recordingStyles}</style>
    </div>
  );
};

export default Recording;
