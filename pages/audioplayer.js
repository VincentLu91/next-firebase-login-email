import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [isAudioSelected, setIsAudioSelected] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [percentage, setPercentage] = useState(0);
  const [summary, setSummary] = useState(null);
  const [translation, setTranslation] = useState(null);
  const [language, setLanguage] = useState(null);
  const [view, setView] = useState("split"); // 'transcript' | 'chat' | 'split'

  const audioRef = useRef();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useUser();
  const supabase = useSupabaseClient();
  const sound = useSelector((state) => state.recordingReducer.sound);

  useEffect(() => {
    const checkAuth = async (user) => {
      if (user) {
        let customerInfo = await supabase
          .from("customers")
          .select("*")
          .eq("email_address", user.email);
        setCustomer(customerInfo.data[0]);
      } else {
        router.push("/signin");
      }
    };

    checkAuth(user);
  }, [user, router, supabase]);

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
      { shallow: true }
    );
  };

  async function urlToDuration(audioUrl) {
    const durationSeconds = await getBlobDuration(audioUrl);
    console.log("durationSeconds is: ", durationSeconds);
    setDurationSeconds(durationSeconds);
  }

  const onChange = (e) => {
    const p = Number(e.target.value);
    setPercentage(p);
    if (!audioRef.current) return;
    const d = audioRef.current.duration || durationSeconds;
    if (!d) return; // ← guard: avoids jumping to 0
    audioRef.current.currentTime = (p / 100) * d;
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
        transcript
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

      {/* Layout container driven by 'view' */}
      {/* Layout (conditional render — no CSS tricks) */}
      <div style={{ margin: "0 24px 24px" }}>
        {view === "split" ? (
          <div
            className="pair split"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              alignItems: "start",
            }}
          >
            {/* Transcript pane */}
            <section
              id="transcriptPane"
              className="u-card"
              style={{
                padding: 16,
                display: "flex",
                flexDirection: "column",
                height: "800px",
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
                    {/* hiding this for now. summary displayed screws up height of control panel */}
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
                      <span style={{ color: "var(--accent-400)" }}>
                        Summary
                      </span>
                    </button>*/}
                  </div>

                  <textarea
                    readOnly
                    value={sound?.full_transcript || "No transcript available."}
                    style={{
                      flex: 1,
                      width: "100%",
                      height: "800px",
                      maxHeight: "800px",
                      overflowY: "auto",
                      whiteSpace: "pre-wrap",
                      color: "var(--muted)",
                      lineHeight: 1.7,
                      marginTop: 12,
                      padding: "15px",
                      backgroundColor: "var(--muted-100)",
                      borderRadius: "8px",
                      border: "1px solid var(--muted-300)",
                      resize: "none",
                      fontFamily: "inherit",
                      fontSize: "inherit",
                    }}
                  />

                  {/* summary takes up the height space of control panel and shrinks transcript. messed up*/}
                  {/*summary && (
                    <p style={{ color: "var(--text)", marginTop: 8 }}>
                      Summary: {summary}
                    </p>
                  )*/}

                  <div
                    className="audioplayer-body"
                    style={{ marginTop: "auto", paddingTop: 16 }}
                  >
                    <div className="audioplayer-container">
                      <Slider onChange={onChange} percentage={percentage} />
                      <audio
                        ref={audioRef}
                        crossOrigin="anonymous"
                        preload="metadata"
                        src={audioUrl || undefined}
                        onLoadedMetadata={(e) =>
                          setDurationSeconds(e.currentTarget.duration || 0)
                        }
                        onTimeUpdate={(e) => {
                          const t = e.currentTarget.currentTime || 0;
                          const d =
                            e.currentTarget.duration || durationSeconds || 1;
                          setCurrentTime(t);
                          setPercentage(Number(((t / d) * 100).toFixed(2)));
                        }}
                      />
                      <ControlPanel
                        play={play}
                        isPlaying={isPlaying}
                        duration={durationSeconds}
                        currentTime={currentTime}
                        audioRef={audioRef}
                      />
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
              style={{ padding: 16, height: "800px" }}
            >
              <ChatPanel sound={sound} soundUrl={audioUrl} />
            </section>
          </div>
        ) : view === "chat" ? (
          // Chat-only
          <section
            id="chatPane"
            className="u-card"
            style={{ padding: 16, height: "800px" }}
          >
            <ChatPanel sound={sound} soundUrl={audioUrl} />
          </section>
        ) : (
          // Transcript-only
          <section
            id="transcriptPane"
            className="u-card"
            style={{
              padding: 16,
              display: "flex",
              flexDirection: "column",
              height: "800px",
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
                    flex: 1,
                    width: "100%",
                    height: "800px",
                    maxHeight: "800px",
                    overflowY: "auto",
                    whiteSpace: "pre-wrap",
                    color: "var(--muted)",
                    lineHeight: 1.7,
                    marginTop: 12,
                    padding: "15px",
                    backgroundColor: "var(--muted-100)",
                    borderRadius: "8px",
                    border: "1px solid var(--muted-300)",
                    resize: "none",
                    fontFamily: "inherit",
                    fontSize: "inherit",
                  }}
                />

                {/* messes up height of Control Panel. not needed for now*/}
                {/*summary && (
                  <p style={{ color: "var(--text)", marginTop: 8 }}>
                    Summary: {summary}
                  </p>
                )*/}

                <div
                  className="audioplayer-body"
                  style={{ marginTop: "auto", paddingTop: 16 }}
                >
                  <div className="audioplayer-container">
                    <Slider onChange={onChange} percentage={percentage} />
                    <audio
                      ref={audioRef}
                      crossOrigin="anonymous"
                      preload="metadata"
                      src={audioUrl || undefined}
                      onLoadedMetadata={(e) =>
                        setDurationSeconds(e.currentTarget.duration || 0)
                      }
                      onTimeUpdate={(e) => {
                        const t = e.currentTarget.currentTime || 0;
                        const d =
                          e.currentTarget.duration || durationSeconds || 1;
                        setCurrentTime(t);
                        setPercentage(Number(((t / d) * 100).toFixed(2)));
                      }}
                    />
                    <ControlPanel
                      play={play}
                      isPlaying={isPlaying}
                      duration={durationSeconds}
                      currentTime={currentTime}
                      audioRef={audioRef}
                    />
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
