import { useReactMediaRecorder } from "react-media-recorder";
// keep it at 1.6.5: https://github.com/DeltaCircuit/react-media-recorder/issues/98
import * as React from "react";
import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateRecordingList, setRecordURI } from "../redux/recording/actions";
import moment from "moment";
import getBlobDuration from "get-blob-duration";
import RecordRTC, { StereoAudioRecorder } from "recordrtc"; // only run on the browser
import { useRouter } from "next/router";
import { useUser } from "@supabase/auth-helpers-react";
import fileToArrayBuffer from "file2arraybuffer";
import axios from "axios";
import { supabase } from "../utils/initSupabase";
import { storeAsMp3 } from "../utils/storeAsMp3";

// --- MP3 transcode (browser-only) ---
let _ffmpeg; // singleton
let _ffmpegLoading = null;

async function ensureFFmpeg() {
  if (typeof window === "undefined") return null;
  if (_ffmpeg) return _ffmpeg;
  if (_ffmpegLoading) return _ffmpegLoading;

  _ffmpegLoading = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");
    const ffmpeg = new FFmpeg();

    const version = "0.12.10"; // set to your installed @ffmpeg/ffmpeg
    const isIso = window.crossOriginIsolated === true;
    const pkg = isIso ? "core-mt" : "core";
    const base = `https://unpkg.com/@ffmpeg/${pkg}@${version}/dist/umd`;

    console.log("[ffmpeg] iso:", isIso, "| using:", pkg);

    const loadOpts = {
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
    };
    if (isIso) {
      loadOpts.workerURL = await toBlobURL(
        `${base}/ffmpeg-core.worker.js`,
        "text/javascript"
      );
    }

    await ffmpeg.load(loadOpts);
    _ffmpeg = ffmpeg;
    return ffmpeg;
  })();

  return _ffmpegLoading;
}

async function wavBlobToMp3(
  wavBlob,
  { bitrate = "128k", outName = "out.mp3" } = {}
) {
  const ffmpeg = await ensureFFmpeg();
  if (!ffmpeg) throw new Error("FFmpeg not available (SSR?)");

  const inName = "input.wav";
  const bytes = new Uint8Array(await wavBlob.arrayBuffer());
  await ffmpeg.writeFile(inName, bytes);

  await ffmpeg.exec([
    "-i",
    inName,
    "-vn",
    "-ar",
    "44100",
    "-ac",
    "2",
    "-b:a",
    bitrate,
    outName,
  ]);

  const mp3Data = await ffmpeg.readFile(outName);
  return new Blob([mp3Data.buffer], { type: "audio/mpeg" });
}

const recordingStyles = `
:root {
--bg: #0b0d12;
--panel: #11151d;
--muted: #a0a8b8;
--text: #e6e8ef;
--primary: #2563eb;
--primary-600: #1d4ed8;
--danger: #ef4444;
--danger-600: #dc2626;
--ring: rgba(37, 99, 235, 0.45);
--shadow: 0 10px 20px rgba(0,0,0,0.25);
--radius: 14px;
--radius-sm: 10px;
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
background: var(--danger);
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

.btn-danger { background: var(--danger); }
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
`;

const Recording = () => {
  const router = useRouter();
  const user = useUser();
  const [timeDifference, setTimeDifference] = React.useState(0);

  const storeDifferenceInSupabase = async (difference) => {
    try {
      let { data: customerInfo, error: fetchError } = await supabase
        .from("customers")
        .select("id")
        .eq("email_address", user.email)
        .single();

      if (fetchError) {
        throw new Error(`Error fetching customer info: ${fetchError.message}`);
      }

      const { error: updateError } = await supabase
        .from("customers")
        .update({ mic_tokens: difference })
        .eq("id", customerInfo.id);

      if (updateError) {
        throw new Error(`Error updating mic_tokens: ${updateError.message}`);
      }

      console.log("Successfully stored difference in Supabase.");
    } catch (error) {
      console.error("Error storing difference in Supabase:", error.message);
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
            const difference = numMicTokens - newElapsedTime;
            setTimeDifference(difference);
            storeDifferenceInSupabase(difference);
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
  const [transcript, setTranscript] = React.useState("");
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const [time, setTime] = React.useState(0);
  const [numMicTokens, setNumMicTokens] = React.useState(0);
  const [elapsedTime, setElapsedTime] = React.useState(0);
  const timerRef = React.useRef(null);
  const intervalIdRef = React.useRef(null);
  const dispatch = useDispatch();
  const recordingList = useSelector(
    (state) => state.recordingReducer.recordingList
  );

  const isRecording = useSelector(
    (state) => state.recordingReducer.isRecording
  );
  const recordURI = useSelector((state) => state.recordingReducer.recordURI);

  // Keep recorder reference in a ref to persist between renders
  const recorderRef = React.useRef(null);

  const getNumMicTokens = useCallback(async () => {
    let tokenResponse = await supabase
      .from("customers")
      .select("*")
      .eq("email_address", user?.email);
    setNumMicTokens(tokenResponse?.data[0]?.mic_tokens);
    setTimeDifference(tokenResponse?.data[0]?.mic_tokens);
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

      // 4) Insert DB row
      console.log("Saving to database...");
      const row = {
        file_name: audioData.file_name,
        original_file_name: mp3Name,
        full_transcript: audioData.full_transcript,
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
    setLiveTranscript("");

    startRecording();
    setIsTranscribing(true);
    const response = await fetch("/api/token");
    const data = await response.json();
    if (data.error) {
      alert(data.error);
      return;
    }

    const { token } = data;

    if (!window.socket) {
      window.socket = await new WebSocket(
        `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`
      );
    }

    window.socket.onmessage = (message) => {
      let msg = "";
      const res = JSON.parse(message.data);
      setTexts((prevTexts) => {
        const newTexts = { ...prevTexts, [res.audio_start]: res.text };
        const keys = Object.keys(newTexts);
        keys.sort((a, b) => a - b);
        for (const key of keys) {
          if (newTexts[key]) {
            msg += ` ${newTexts[key]}`;
          }
        }
        setLiveTranscript(msg);
        return newTexts;
      });
    };

    window.socket.onerror = (event) => {
      console.error(event);
      window.socket.close();
      setIsTranscribing(false);
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
            timeSlice: 250,
            // Get data every 250ms
            ondataavailable: (blob) => {
              // Convert blob to array buffer
              const reader = new FileReader();
              reader.onload = () => {
                const buffer = reader.result;
                if (window.socket.readyState === WebSocket.OPEN) {
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
        .select("id")
        .eq("email_address", user.email)
        .single();

      if (custErr) throw custErr;
      if (!customer?.id) {
        throw new Error(
          "Customer ID not found. Please ensure you have an active subscription."
        );
      }

      const audioData = {
        customer_id: customer.id,
        file_name: filename,
        duration,
        full_transcript: transcript || liveTranscript, // Use either transcript or liveTranscript
        transcript: transcript || liveTranscript, // Include both for backward compatibility
      };

      console.log("Audio data with transcript:", audioData); // Debug log

      if (typeof reset === "function") reset();

      await uploadAudio(audioData);

      setFilename("");
      dispatch(setRecordURI(null));
      router.push("/dashboard");
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
            <div className="transcript" aria-live="polite">
              {liveTranscript}
            </div>
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
          <div className="transcript">{transcript}</div>
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

      {renderView()}

      <style jsx>{recordingStyles}</style>
    </div>
  );
};

export default Recording;
