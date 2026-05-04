import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { useProtectedPage } from "../utils/auth-helpers";
import Select from "react-select";
import axios from "axios";
import Slider from "../components/slider/Slider";
import ControlPanel from "../components/controls/ControlPanel";
import { setSound } from "../redux/recording/actions";
import translate_config from "../pages/api/translate_config";

export default function EditRecordingFile() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, customer, loading: authLoading, supabase } = useProtectedPage();
  const sound = useSelector((state) => state.recordingReducer.sound);
  const [percentage, setPercentage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioURL, setAudioURL] = useState(null);
  const [isAudioSelected, setIsAudioSelected] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [summary, setSummary] = useState(null);
  const [translation, setTranslation] = useState(null);
  const [language, setLanguage] = useState(null);
  const [editName, setEditName] = useState("");
  const [editTranscript, setEditTranscript] = useState("");

  const docID = useSelector((state) => state.recordingReducer.docID);
  const tableName = useSelector((state) => state.recordingReducer.tableName);

  useEffect(() => {
    console.log("EditRecordingFile mounted with:", {
      docID,
      soundId: sound?.id,
      fileName: sound?.file_name,
      originalFileName: sound?.original_file_name,
    });

    if (sound) {
      setEditName(sound.file_name || "");
      setEditTranscript(sound.full_transcript || "");
    }
  }, [sound, docID]);

  const audioRef = useRef();

  const getSummary = async (transcript) => {
    if (sound == null || transcript == null) {
      setSummary("Transcript is empty!");
      return;
    }
    const rawSummary = await axios.post(
      "/api/cohere_llm?prompt=" +
        "generate a summary for the following transcript: " +
        transcript,
    );
    console.log(rawSummary.data.text);
    setSummary(rawSummary.data.text.trim());
  };

  const getTranslation = async (lang) => {
    try {
      const resp = await axios.post(
        `${translate_config.api_address}${translate_config.route_path}`,
        { lang },
      );
      const translated_text = resp.data["translated_text"];
      setTranslation(translated_text);
    } catch (error) {
      if (error.response) {
        console.log(error.response.status);
        console.log(error.response);
      } else {
        console.log(error);
      }
    }
  };

  useEffect(() => {
    if (customer && sound) {
      const uri = supabase.storage
        .from("recreate-ai-storage-bucket")
        .getPublicUrl(sound.original_file_name);
      console.log("uri is: ", uri.data.publicUrl);
      setAudioURL(uri.data.publicUrl);
      setIsAudioSelected(true);
    } else {
      setIsAudioSelected(false);
    }
  }, [dispatch, sound, customer, supabase]);

  const onChange = (e) => {
    const p = Number(e.target.value);
    setPercentage(p);
    if (!audioRef.current) return;
    const d = audioRef.current.duration || durationSeconds;
    if (!d) return;
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

  const languages = [
    { value: "chinese", label: "Chinese" },
    { value: "german", label: "German" },
  ];

  const handleChange = (e) => {
    setLanguage(e.label);
    console.log("Language selected: ", e.value);
  };

  const handleEditName = (e) => {
    setEditName(e.target.value);
  };

  const handleEditTranscript = (e) => {
    setEditTranscript(e.target.value);
  };

  const resolveRecordingId = () => {
    const id = docID || sound?.id;
    if (!id) return null;

    console.log("[resolveRecordingId] Using ID:", {
      docID,
      soundId: sound?.id,
      finalId: id,
    });

    const s = String(id).trim();
    return /^\d+$/.test(s) ? s : null;
  };

  const onSubmitRenameName = async (newName) => {
    if (isLoading) return;

    const idStr = resolveRecordingId();
    const nameTrimmed = (newName ?? "").trim();

    if (!idStr) {
      console.error("[rename] invalid id", { docID, soundId: sound?.id });
      alert(
        `Invalid recording id for mic_recordings. (sound.id was: ${
          sound?.id ?? "null"
        })`,
      );
      return;
    }
    if (!nameTrimmed) {
      alert("File name cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      console.log("[rename] updating", {
        tableName,
        id: idStr,
        file_name: nameTrimmed,
        docID,
        soundId: sound?.id,
      });

      const { data, error } = await supabase
        .from(tableName)
        .update({ file_name: nameTrimmed })
        .eq("id", idStr)
        .select("id,file_name");

      if (error) throw error;
      if (!data || data.length === 0) {
        alert(`No row found to update (table: ${tableName}, id: ${idStr}).`);
        return;
      }

      const row = data[0];
      dispatch(setSound({ ...sound, file_name: row.file_name }));
      setEditName(row.file_name);
    } catch (err) {
      console.error("Error renaming:", err);
      alert(err.message || "Rename failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitRenameTranscript = async (newTranscript) => {
    if (isLoading) return;

    const idStr = resolveRecordingId();
    if (!idStr) {
      console.error("[transcript] invalid id", { docID, soundId: sound?.id });
      alert(
        `Invalid recording id for mic_recordings. (sound.id was: ${
          sound?.id ?? "null"
        })`,
      );
      return;
    }

    setIsLoading(true);
    try {
      console.log("[transcript] updating", { tableName, id: idStr });

      const { data, error } = await supabase
        .from(tableName)
        .update({ full_transcript: newTranscript })
        .eq("id", idStr)
        .select("id,full_transcript");

      if (error) throw error;
      if (!data || data.length === 0) {
        alert(`No row found to update (table: ${tableName}, id: ${idStr}).`);
        return;
      }

      const row = data[0];
      dispatch(setSound({ ...sound, full_transcript: row.full_transcript }));
      setEditTranscript(row.full_transcript);
    } catch (err) {
      console.error("Transcript update failed:", err);
      alert(err.message || "Transcript save failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const originalName = sound?.file_name || "";
  const originalTranscript = sound?.full_transcript || "";

  const hasNameChanged = editName !== originalName;
  const hasTranscriptChanged = editTranscript !== originalTranscript;
  const hasChanges = hasNameChanged || hasTranscriptChanged;

  const canSaveChanges = hasChanges && editName.trim() && !isLoading;

  const handleCancelEdit = () => {
    setEditName(originalName);
    setEditTranscript(originalTranscript);
    router.push("/audioplayer");
  };

  const handleSaveChanges = async () => {
    if (!canSaveChanges) return;

    const idStr = resolveRecordingId();
    const nameTrimmed = editName.trim();

    if (!idStr) {
      alert("Invalid recording id.");
      return;
    }

    const updates = {};

    if (hasNameChanged) {
      updates.file_name = nameTrimmed;
    }

    if (hasTranscriptChanged) {
      updates.full_transcript = editTranscript;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq("id", idStr)
        .select("id,file_name,full_transcript");

      if (error) throw error;

      const row = data?.[0];

      const updatedSound = {
        ...sound,
        file_name: row?.file_name ?? nameTrimmed,
        full_transcript: row?.full_transcript ?? editTranscript,
      };

      dispatch(setSound(updatedSound));
      setEditName(updatedSound.file_name);
      setEditTranscript(updatedSound.full_transcript);

      router.push("/audioplayer");
    } catch (err) {
      console.error("Save changes failed:", err);
      alert(err.message || "Save changes failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="top-bar">
        {/*<div>
          <h1 className="title">Edit Recording</h1>
          <h2 className="notice">
            For best results, play the recording on Chrome
          </h2>
        </div>*/}
        <button
          className="back-button"
          onClick={() => router.push("/dashboard")}
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="main-grid">
        {/*<div className="card audio-player-card" data-delay="0">
          <div className="audioplayer-container">
            <Slider percentage={percentage} onChange={onChange} />
            <audio
              ref={audioRef}
              key={audioURL}
              crossOrigin="anonymous"
              preload="metadata"
              src={audioURL || undefined}
              onLoadedMetadata={(e) => {
                const d = e.currentTarget.duration || 0;
                setDurationSeconds(d);
              }}
              onTimeUpdate={(e) => {
                const t = e.currentTarget.currentTime || 0;
                const d = e.currentTarget.duration || 1;
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
        </div>*/}

        {isAudioSelected ? (
          <>
            <div className="card editor-panel" data-delay="60">
              <label htmlFor="editName" className="label">
                File Name
              </label>
              <textarea
                id="editName"
                name="editName"
                onChange={handleEditName}
                value={editName}
                className="textarea filename-textarea"
                placeholder="Edit the filename..."
              />
            </div>

            <div className="card editor-panel" data-delay="120">
              <label htmlFor="editTranscript" className="label">
                Transcript
              </label>
              <textarea
                id="editTranscript"
                name="editTranscript"
                onChange={handleEditTranscript}
                value={editTranscript}
                className="textarea transcript-textarea"
                placeholder="Edit the transcript"
              />
            </div>

            <div className="action-row edit-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={handleCancelEdit}
                disabled={isLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className={`primary-button ${isLoading ? "loading" : ""}`}
                onClick={handleSaveChanges}
                disabled={!canSaveChanges}
                aria-busy={isLoading}
              >
                Save Changes
              </button>
            </div>
          </>
        ) : (
          <div className="card">
            <h1 className="title">No Audio Selected</h1>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .page-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 24px 20px;
          background: var(--bg-900);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            sans-serif;
          color: var(--text-100);
          line-height: 1.45;
          font-size: 0.875rem;
        }

        .top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-100);
          margin: 0;
        }

        .notice {
          font-size: 14px;
          color: var(--text-300);
          margin: 0;
        }

        .back-button {
          background-color: transparent;
          border: 1px solid var(--muted-600);
          border-radius: 50px;
          padding: 8px 24px;
          cursor: pointer;
          color: var(--text-300);
          transition: all 180ms ease-out;
        }

        .back-button:hover {
          transform: translateY(-1px);
        }

        .back-button:focus {
          outline: none;
        }

        .main-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          margin-top: 12px;
        }

        .card {
          background: var(--bg-800);
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          padding: 16px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
          animation: fadeUp 240ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }

        .card[data-delay="0"] {
          animation-delay: 0ms;
        }

        .card[data-delay="60"] {
          animation-delay: 60ms;
        }

        .card[data-delay="120"] {
          animation-delay: 120ms;
        }

        .card:hover {
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.28);
        }

        .audio-player-card :global(.progress-track) {
          height: 6px;
          border-radius: 9999px;
          background: var(--bg-700);
          position: relative;
          cursor: pointer;
        }

        .audio-player-card :global(.progress-fill) {
          position: absolute;
          height: 100%;
          background: var(--accent-400);
          border-radius: 9999px;
        }

        .audio-player-card :global(.progress-thumb) {
          width: 16px;
          height: 16px;
          background: var(--text-100);
          border: 2px solid var(--accent-400);
          border-radius: 50%;
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
          transition: transform 120ms ease-out;
        }

        .audio-player-card :global(.progress-thumb:hover) {
          transform: translate(-50%, -50%) scale(1.04);
        }

        .audio-player-card :global(.progress-thumb:active) {
          transform: translate(-50%, -50%) scale(1.1);
          box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.15);
        }

        .editor-panel {
          display: flex;
          flex-direction: column;
          width: 100%;
          box-sizing: border-box;
          padding: 24px;
          gap: 16px;
          background: var(--bg-800);
          border: 1px solid var(--border);
          font-family: Manrope-Medium, -apple-system, system-ui, sans-serif;
        }

        .label {
          font-size: 24px;
          font-weight: 500;
          margin-bottom: 16px;
          color: var(--text-100);
          font-family: Manrope-Medium, -apple-system, system-ui, sans-serif;
        }

        .textarea {
          border: 1px solid var(--border);
          border-radius: var(--radius-input);
          padding: 16px;
          background: var(--bg-700);
          width: 100%;
          box-sizing: border-box;
          margin: 0;
          transition: all 140ms ease;
          font-family: Manrope-Medium, -apple-system, system-ui, sans-serif;
          font-size: 1.5rem;
          font-weight: 500;
          color: var(--text-100);
          caret-color: var(--accent-400);
          resize: vertical;
          line-height: 1.6;
        }

        .textarea::placeholder {
          color: var(--text-300);
        }

        .textarea::selection {
          background: rgba(168, 85, 247, 0.28);
        }

        .textarea:focus {
          outline: none;
          border-color: var(--accent-400);
          box-shadow: 0 0 0 4px var(--focus);
        }

        .filename-textarea {
          min-height: 60px;
          height: 60px;
          font-size: 1.75rem;
          font-weight: 500;
          resize: none;
          padding: 16px;
        }

        .transcript-textarea {
          min-height: 360px;
          font-family: Manrope-Medium, -apple-system, system-ui, sans-serif;
          padding: 16px;
        }

        .action-row {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 16px;
        }

        @media (max-width: 960px) {
          .action-row {
            gap: 8px;
            flex-direction: column;
          }
        }

        .edit-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-top: 24px;
        }

        .secondary-button {
          background: var(--bg-800);
          color: var(--text-100);
          padding: 12px 16px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          border: 1px solid var(--border);
          min-height: 56px;
          cursor: pointer;
          transition: all 180ms ease-out;
          width: 100%;
        }

        .secondary-button:hover:not(:disabled) {
          background: var(--bg-700);
          transform: translateY(-2px);
        }

        .secondary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .primary-button {
          background: var(--accent-400);
          color: var(--bg-900);
          padding: 12px 16px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          border: 0;
          min-height: 48px;
          cursor: pointer;
          box-shadow: 0 6px 16px rgba(168, 85, 247, 0.25);
          transition: all 180ms ease-out;
          width: 100%;
        }

        .primary-button:hover:not(:disabled) {
          background: var(--accent-500);
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(168, 85, 247, 0.3);
        }

        .primary-button:active:not(:disabled) {
          transform: scale(0.98);
          box-shadow: 0 4px 12px rgba(255, 165, 0, 0.22);
        }

        .primary-button:focus {
          outline: none;
          box-shadow: 0 0 0 3px var(--focus);
        }

        .primary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .primary-button.loading {
          position: relative;
          color: transparent;
        }

        .primary-button.loading::after {
          content: "";
          position: absolute;
          width: 16px;
          height: 16px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: 2px solid rgba(0, 0, 0, 0.3);
          border-top-color: #000000;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .rename-button {
          background: var(--accent-400);
          color: var(--bg-900);
          padding: 8px 12px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.875rem;
          border: 0;
          min-height: 48px;
          min-width: 132px;
          cursor: pointer;
          box-shadow: 0 6px 16px rgba(168, 85, 247, 0.25);
          transition: all 180ms ease-out;
          width: auto;
          align-self: flex-start;
        }

        .rename-button:hover:not(:disabled) {
          background: var(--accent-500);
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(168, 85, 247, 0.3);
        }

        .rename-button:active:not(:disabled) {
          transform: scale(0.98);
          box-shadow: 0 4px 12px rgba(255, 165, 0, 0.22);
        }

        .rename-button:focus {
          outline: none;
          box-shadow: 0 0 0 3px var(--focus);
        }

        .rename-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .rename-button.loading {
          position: relative;
          color: transparent;
        }

        .rename-button.loading::after {
          content: "";
          position: absolute;
          width: 16px;
          height: 16px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: 2px solid rgba(0, 0, 0, 0.3);
          border-top-color: #000000;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
      `}</style>
    </div>
  );
}
