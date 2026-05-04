import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { useProtectedPage } from "../utils/auth-helpers";
import { setSound, setDocID, setTableName } from "../redux/recording/actions";
import Select from "react-select";
import axios from "axios";
import getBlobDuration from "get-blob-duration";
import ControlPanel from "../components/controls/ControlPanel";
import Slider from "../components/slider/Slider";
import audioPlayerStyles from "../styles/audioPlayerStyles";
import SplitView from "../components/SplitView";
import ViewBar from "../components/ViewBar";
import ChatPanel from "../components/ChatPanel";

export default function AudioPlayer() {
  const { user, customer, loading, supabase } = useProtectedPage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [isAudioSelected, setIsAudioSelected] = useState(false);
  const [percentage, setPercentage] = useState(0);
  const [summary, setSummary] = useState(null);
  const [translation, setTranslation] = useState(null);
  const [language, setLanguage] = useState(null);
  const [view, setView] = useState("split"); // 'transcript' | 'chat' | 'split'

  const copyTranscript = async () => {
    const transcript = sound?.full_transcript || "No transcript available.";
    const textToCopy = `${transcript}\n\n- Made with placeholder app`;
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const audioRef = useRef();
  const lastKnownTimeRef = useRef(0);
  const splitPlayerRef = useRef(null);
  const [splitPlayerHeight, setSplitPlayerHeight] = useState(null);
  const router = useRouter();
  const dispatch = useDispatch();
  const sound = useSelector((state) => state.recordingReducer.sound);

  useEffect(() => {
    if (view !== "split") return;

    const updateSplitPlayerHeight = () => {
      if (splitPlayerRef.current) {
        setSplitPlayerHeight(splitPlayerRef.current.offsetHeight);
      }
    };

    updateSplitPlayerHeight();

    window.addEventListener("resize", updateSplitPlayerHeight);

    return () => {
      window.removeEventListener("resize", updateSplitPlayerHeight);
    };
  }, [view, sound, audioUrl, durationSeconds]);

  useEffect(() => {
    if (customer && sound) {
      const uri = supabase.storage
        .from("recreate-ai-storage-bucket")
        .getPublicUrl(sound.original_file_name);
      setAudioUrl(uri.data.publicUrl);
      setIsAudioSelected(true);
    } else {
      setIsAudioSelected(false);
    }
  }, [customer, sound, supabase]);

  useEffect(() => {
    const v = router.query.view;
    if (v === "transcript" || v === "chat" || v === "split") setView(v);
  }, [router.query.view]);

  const setViewAndURL = (v) => {
    setView(v);
    router.replace(
      { pathname: router.pathname, query: { ...router.query, view: v } },
      undefined,
      { shallow: true },
    );
  };

  async function urlToDuration(audioUrl) {
    const durationSeconds = await getBlobDuration(audioUrl);
    console.log("durationSeconds is: ", durationSeconds);
    setDurationSeconds(durationSeconds);
  }

  const handleLoadedMetadata = (e) => {
    const audio = e.currentTarget;
    const duration = audio.duration || 0;

    setDurationSeconds(duration);

    const restoreTime = Math.min(lastKnownTimeRef.current || 0, duration || 0);

    if (restoreTime > 0 && Math.abs(audio.currentTime - restoreTime) > 0.5) {
      audio.currentTime = restoreTime;
    }

    if (isPlaying) {
      audio.play().catch((err) => {
        console.error("Failed to resume audio after view switch:", err);
        setIsPlaying(false);
      });
    }
  };

  const handleTimeUpdate = (e) => {
    const audio = e.currentTarget;
    const t = audio.currentTime || 0;
    const d = audio.duration || durationSeconds || 1;

    lastKnownTimeRef.current = t;
    setCurrentTime(t);
    setPercentage(Number(((t / d) * 100).toFixed(2)));
  };

  const onChange = (e) => {
    const p = Number(e.target.value);
    setPercentage(p);

    if (!audioRef.current) return;

    const d = audioRef.current.duration || durationSeconds;
    if (!d) return;

    const nextTime = (p / 100) * d;

    audioRef.current.currentTime = nextTime;
    lastKnownTimeRef.current = nextTime;
    setCurrentTime(nextTime);
  };

  const play = () => {
    const audio = audioRef.current;
    audio.volume = 0.1;

    if (!isPlaying) {
      setIsPlaying(true);
      audio.play();
    }

    if (isPlaying) {
      setIsPlaying(false);
      audio.pause();
    }
  };

  const getCurrDuration = (e) => {
    const percent = (
      (e.currentTarget.currentTime / durationSeconds) *
      100
    ).toFixed(2);
    const time = e.currentTarget.currentTime;
    setPercentage(+percent);
    setCurrentTime(time.toFixed(2));
  };

  async function goEditFile(sound) {
    dispatch(setSound(sound));

    let micRenameInfo = await supabase
      .from("mic_recordings")
      .select("*")
      .eq("original_file_name", sound.original_file_name)
      .single();

    let callRenameInfo = await supabase
      .from("call_recordings")
      .select("*")
      .eq("original_file_name", sound.original_file_name)
      .single();

    if (micRenameInfo?.data) {
      dispatch(setDocID(micRenameInfo.data.id));
      dispatch(setTableName("mic_recordings"));
      router.push("/editrecordingfile");
      return;
    }

    if (callRenameInfo?.data) {
      dispatch(setDocID(callRenameInfo.data.id));
      dispatch(setTableName("call_recordings"));
      router.push("/editrecordingfile");
      return;
    }
  }

  const languages = [
    { value: "chinese", label: "Chinese" },
    { value: "german", label: "German" },
  ];

  const handleChange = (e) => {
    setLanguage(e.label);
  };

  const getSummary = async (transcript) => {
    if (!sound?.full_transcript) {
      setSummary("Transcript is empty!");
      return;
    }
    const rawSummary = await axios.post(
      "/api/cohere_llm?prompt=" +
        "generate a summary for the following transcript: " +
        transcript,
    );
    setSummary(rawSummary.data.text.trim());
  };

  return (
    <div>
      {/* Tabs + Back (no routes, just state) */}
      <div
        className="u-card"
        style={{ margin: "16px 24px", padding: "var(--space-3)" }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className="u-pill btn-muted"
            onClick={() => setViewAndURL("transcript")}
            style={{
              backgroundColor: "transparent",
              borderColor:
                view === "transcript"
                  ? "var(--accent-400)"
                  : "var(--muted-600)",
              borderRadius: "50px",
              padding: "8px 24px",
            }}
          >
            <span
              style={{
                color:
                  view === "transcript"
                    ? "var(--accent-400)"
                    : "var(--text-300)",
              }}
            >
              Transcript
            </span>
          </button>
          <button
            type="button"
            className="u-pill btn-muted"
            onClick={() => setViewAndURL("chat")}
            style={{
              backgroundColor: "transparent",
              borderColor:
                view === "chat" ? "var(--accent-400)" : "var(--muted-600)",
              borderRadius: "50px",
              padding: "8px 24px",
            }}
          >
            <span
              style={{
                color:
                  view === "chat" ? "var(--accent-400)" : "var(--text-300)",
              }}
            >
              Chat
            </span>
          </button>
          <button
            type="button"
            className="u-pill btn-muted"
            onClick={() => setViewAndURL("split")}
            style={{
              backgroundColor: "transparent",
              borderColor:
                view === "split" ? "var(--accent-400)" : "var(--muted-600)",
              borderRadius: "50px",
              padding: "8px 24px",
            }}
          >
            <span
              style={{
                color:
                  view === "split" ? "var(--accent-400)" : "var(--text-300)",
              }}
            >
              Split
            </span>
          </button>

          <div style={{ marginLeft: "auto" }}>
            <button
              type="button"
              className="u-pill btn-muted"
              onClick={() => router.push("/dashboard")}
              style={{
                backgroundColor: "transparent",
                borderColor: "var(--muted-600)",
                borderRadius: "50px",
                padding: "8px 24px",
              }}
            >
              <span style={{ color: "var(--text-300)" }}>
                ← Back to Dashboard
              </span>
            </button>
          </div>
        </div>
      </div>

      {isAudioSelected && (
        <audio
          ref={audioRef}
          crossOrigin="anonymous"
          preload="metadata"
          src={audioUrl || undefined}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          style={{ display: "none" }}
        />
      )}

      {/* Layout container driven by 'view' */}
      {/* Layout (conditional render — no CSS tricks) */}
      <div style={{ margin: "0 24px 24px" }}>
        {view === "split" ? (
          <div
            className="pair split"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(430px, 500px) minmax(420px, 1fr)",
              gap: 16,
              alignItems: "stretch",
              height: "730px",
            }}
          >
            {/* Transcript pane */}
            <section
              ref={splitPlayerRef}
              id="transcriptPane"
              className="u-card"
              style={{
                padding: 28,
                display: "flex",
                flexDirection: "column",
                backgroundColor: "var(--bg-800)",
                border: "1px solid var(--muted-600)",
                borderRadius: 36,
                height: "100%",
                boxSizing: "border-box",
              }}
            >
              {isAudioSelected ? (
                <>
                  <div
                    style={{
                      width: "100%",
                      backgroundColor: "var(--bg-700)",
                      borderRadius: "24px",
                      border: "1px solid var(--muted-600)",
                      padding: "18px 18px 20px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 18,
                      }}
                    >
                      <h2
                        style={{
                          margin: 0,
                          fontSize: 22,
                          fontWeight: 800,
                          color: "var(--text-100)",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        Transcript
                      </h2>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <button
                          type="button"
                          className="u-pill btn-muted"
                          onClick={() => goEditFile(sound)}
                          style={{
                            backgroundColor: "var(--bg-800)",
                            borderColor: "var(--muted-600)",
                            borderRadius: "50px",
                            padding: "8px 18px",
                            color: "var(--text-100)",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                            Edit
                          </span>
                        </button>

                        <button
                          type="button"
                          className="u-pill btn-muted"
                          onClick={copyTranscript}
                          style={{
                            backgroundColor: "var(--bg-800)",
                            borderColor: "var(--muted-600)",
                            borderRadius: "50px",
                            padding: "8px 18px",
                            color: "var(--text-100)",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="9" y="9" width="13" height="13" rx="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Copy
                          </span>
                        </button>
                      </div>
                    </div>

                    <textarea
                      readOnly
                      value={
                        sound?.full_transcript || "No transcript available."
                      }
                      style={{
                        width: "100%",
                        height: "260px",
                        overflowY: "auto",
                        whiteSpace: "pre-wrap",
                        color: "var(--text-100)",
                        lineHeight: 1.65,
                        marginTop: 0,
                        padding: "0 8px 4px",
                        backgroundColor: "transparent",
                        borderRadius: 0,
                        border: "none",
                        resize: "none",
                        fontFamily: "inherit",
                        fontSize: 16,
                        textAlign: "center",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ margin: "26px 0 18px", textAlign: "center" }}>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 32,
                        fontWeight: 800,
                        color: "var(--text-100)",
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {sound?.file_name}
                    </h2>

                    <p
                      style={{
                        margin: "8px 0 0",
                        fontSize: 20,
                        color: "var(--text-300)",
                        fontWeight: 400,
                      }}
                    >
                      {sound?.file_name?.toLowerCase().includes("call")
                        ? "Phone recording"
                        : "Mic recording"}
                    </p>
                  </div>

                  {/* summary takes up the height space of control panel and shrinks transcript. messed up*/}
                  {/*summary && (
                    <p style={{ color: "var(--text)", marginTop: 8 }}>
                      Summary: {summary}
                    </p>
                  )*/}

                  <div
                    className="audioplayer-body"
                    style={{ marginTop: 22, paddingTop: 0 }}
                  >
                    <div className="audioplayer-container">
                      <ControlPanel
                        play={play}
                        isPlaying={isPlaying}
                        duration={durationSeconds}
                        currentTime={currentTime}
                        audioRef={audioRef}
                      />
                      <Slider onChange={onChange} percentage={percentage} />
                    </div>
                  </div>
                </>
              ) : (
                <p className="muted">No audio selected</p>
              )}
            </section>

            {/* Chat pane */}
            <section
              id="chatPane"
              className="u-card"
              style={{
                padding: 0,
                height: "100%",
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <ChatPanel sound={sound} soundUrl={audioUrl} />
            </section>
          </div>
        ) : view === "chat" ? (
          // Chat-only
          <section
            id="chatPane"
            className="u-card"
            style={{
              padding: 0,
              height: splitPlayerHeight ? `${splitPlayerHeight}px` : "auto",
              overflow: "hidden",
            }}
          >
            <ChatPanel sound={sound} soundUrl={audioUrl} />
          </section>
        ) : (
          // Transcript-only
          <section
            id="transcriptPane"
            className="u-card"
            style={{
              width: "min(500px, 100%)",
              margin: "0 auto",
              padding: 28,
              display: "flex",
              flexDirection: "column",
              height: "730px",
              backgroundColor: "var(--bg-800)",
              border: "1px solid var(--muted-600)",
              borderRadius: 36,
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            {isAudioSelected ? (
              <>
                <h3 style={{ marginBottom: 8, fontWeight: 800 }}>
                  {sound?.file_name}
                </h3>
                <div className="u-hr" />
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="u-pill btn-muted"
                    onClick={() => goEditFile(sound)}
                    style={{
                      backgroundColor: "transparent",
                      borderColor: "var(--muted-600)",
                      borderRadius: "50px",
                      padding: "8px 24px",
                    }}
                  >
                    <span style={{ color: "var(--text-300)" }}>
                      Edit filename & transcript
                    </span>
                  </button>
                  {/* again, hiding Summary button as the output messes up height of Control Panel*/}
                  {/*<button
                    type="button"
                    className="u-pill btn-primary"
                    onClick={() => getSummary(sound.full_transcript)}
                    style={{
                      backgroundColor: "rgba(245,184,61,0.12)",
                      borderColor: "var(--accent-400)",
                      borderRadius: "50px",
                      padding: "8px 24px",
                    }}
                  >
                    <span style={{ color: "var(--accent-400)" }}>Summary</span>
                  </button>*/}
                </div>

                <textarea
                  readOnly
                  value={sound?.full_transcript || "No transcript available."}
                  style={{
                    width: "100%",
                    height: view === "split" ? "320px" : "520px",
                    overflowY: "auto",
                    whiteSpace: "pre-wrap",
                    color: "var(--text-100)",
                    lineHeight: 1.65,
                    marginTop: 16,
                    padding: "22px 24px",
                    backgroundColor: "var(--bg-700)",
                    borderRadius: "24px",
                    border: "1px solid var(--muted-600)",
                    resize: "none",
                    fontFamily: "inherit",
                    fontSize: 16,
                    textAlign: "center",
                    outline: "none",
                  }}
                />
                <a
                  onClick={copyTranscript}
                  style={{
                    display: "inline-block",
                    marginTop: "var(--space-2)",
                    marginLeft: "var(--space-2)",
                    fontSize: "11px",
                    color: "var(--text-400)",
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontFamily: "var(--font-family)",
                  }}
                >
                  copy transcript
                </a>

                {/* messes up height of Control Panel. not needed for now*/}
                {/*summary && (
                  <p style={{ color: "var(--text)", marginTop: 8 }}>
                    Summary: {summary}
                  </p>
                )*/}

                <div
                  className="audioplayer-body"
                  style={{ marginTop: 22, paddingTop: 0 }}
                >
                  <div className="audioplayer-container">
                    <ControlPanel
                      play={play}
                      isPlaying={isPlaying}
                      duration={durationSeconds}
                      currentTime={currentTime}
                      audioRef={audioRef}
                    />
                    <Slider onChange={onChange} percentage={percentage} />
                  </div>
                </div>
              </>
            ) : (
              <p className="muted">No audio selected</p>
            )}
          </section>
        )}
      </div>

      <style jsx>{audioPlayerStyles}</style>
      <style jsx>{`
        /* Transcript view - hide chat */
        .pair.transcript {
          display: grid;
          grid-template-columns: 1fr;
        }
        .pair.transcript #chatPane {
          display: none;
        }

        /* Chat view - hide transcript */
        .pair.chat {
          display: grid;
          grid-template-columns: 1fr;
        }
        .pair.chat #transcriptPane {
          display: none;
        }

        /* Split view - show both */
        .pair.split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          align-items: start;
        }
      `}</style>
    </div>
  );
}
