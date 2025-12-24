import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { useProtectedPage } from "../utils/auth-helpers";
import Select from "react-select";
import axios from "axios";
import getBlobDuration from "get-blob-duration";
import styled, { keyframes, css } from "styled-components";
import Slider from "../components/slider/Slider";
import ControlPanel from "../components/controls/ControlPanel";
import { setSound } from "../redux/recording/actions";
import summarize_config from "../pages/api/summarize_config";
import translate_config from "../pages/api/translate_config";

// Animations
const fadeUp = keyframes`
  from { 
    opacity: 0;
    transform: translateY(12px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Styled Components
const PageContainer = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 20px;
  background: rgb(17, 24, 39);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  color: rgb(229, 231, 235);
  line-height: 1.45;
  font-size: 0.875rem;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
`;

const Title = styled.h1`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const Notice = styled.h2`
  font-size: 14px;
  color: #6b7280;
  margin: 0;
`;

const BackButton = styled.button`
  background-color: transparent;
  border: 1px solid var(--muted-600);
  border-radius: 50px;
  padding: 8px 24px;
  cursor: pointer;
  color: var(--text-300);
  transition: all 180ms ease-out;

  &:hover {
    transform: translateY(-1px);
  }

  &:focus {
    outline: none;
  }
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-top: 12px;
`;

const Card = styled.div.attrs(({ delay, ...props }) => ({
  ...props,
}))`
  background: #ffffff;
  border: 1px solid #eef0f2;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  ${({ delay }) => css`
    animation: ${fadeUp} 240ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    animation-delay: ${delay || "0ms"};
  `}
  opacity: 0;

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
`;

const AudioPlayerCard = styled(Card)`
  .progress-track {
    height: 6px;
    border-radius: 9999px;
    background: #e5e7eb;
    position: relative;
    cursor: pointer;
  }

  .progress-fill {
    position: absolute;
    height: 100%;
    background: #2563eb;
    border-radius: 9999px;
  }

  .progress-thumb {
    width: 16px;
    height: 16px;
    background: #ffffff;
    border: 2px solid #2563eb;
    border-radius: 50%;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    transition: transform 120ms ease-out;

    &:hover {
      transform: translate(-50%, -50%) scale(1.04);
    }

    &:active {
      transform: translate(-50%, -50%) scale(1.1);
      box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.15);
    }
  }
`;

const TimeLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
`;

const PlayButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50px;
  background: var(--text);
  color: var(--background);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 180ms ease-out;

  &:hover {
    background: var(--text-300);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    background: var(--muted-300);
    color: var(--text-300);
    cursor: not-allowed;
  }
`;

const EditorPanel = styled(Card)`
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  padding: 24px;
  gap: 16px;
  background: #1e1f26;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-family: Manrope-Medium, -apple-system, system-ui, sans-serif;
`;

const Label = styled.label`
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #ffffff;
  font-family: Manrope-Medium, -apple-system, system-ui, sans-serif;
`;

const TextArea = styled.textarea.attrs(
  ({ isFileName, isTranscript, ...props }) => ({
    ...props,
  })
)`
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  background: #2a2b36;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  transition: all 140ms ease;
  font-family: Manrope-Medium, -apple-system, system-ui, sans-serif;
  font-size: 1.5rem;
  font-weight: 500;
  color: #ffffff;
  caret-color: #ffa500;
  resize: vertical;
  line-height: 1.6;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &::selection {
    background: rgba(255, 165, 0, 0.3);
  }

  &:focus {
    outline: none;
    border-color: #ffa500;
    box-shadow: 0 0 0 4px rgba(255, 165, 0, 0.15);
  }

  ${({ isFileName }) =>
    isFileName &&
    `
    min-height: 60px;
    height: 60px;
    font-size: 1.75rem;
    font-weight: 500;
    resize: none;
    padding: 16px;
  `}

  ${({ isTranscript }) =>
    isTranscript &&
    `
    min-height: 360px;
    font-family: Manrope-Medium, -apple-system, system-ui, sans-serif;
    padding: 16px;
  `}
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;

  @media (max-width: 960px) {
    gap: 8px;
    flex-direction: column;
  }
`;

const PrimaryButton = styled.button.attrs(({ isLoading, ...props }) => ({
  ...props,
}))`
  background: #ffa500;
  color: #000000;
  padding: 12px 16px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  border: 0;
  min-height: 48px;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(255, 165, 0, 0.25);
  transition: all 180ms ease-out;
  width: 100%;

  &:hover {
    background: #ff9000;
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(255, 165, 0, 0.3);
  }

  &:active {
    transform: scale(0.98);
    box-shadow: 0 4px 12px rgba(255, 165, 0, 0.22);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 165, 0, 0.32);
  }

  ${({ isLoading }) =>
    isLoading &&
    css`
      position: relative;
      color: transparent;

      &::after {
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
        ${css`
          animation: ${spin} 0.7s linear infinite;
        `}
      }
    `}
`;

// directly under: const PrimaryButton = styled.button`...`
const RenameButton = styled(PrimaryButton)`
  width: auto; /* stop filling the card */
  min-width: 132px; /* keeps a nice touch target */
  padding: 8px 12px; /* smaller visual size */
  font-size: 0.875rem; /* tighten type */
  border-radius: 10px;
  align-self: flex-start; /* respects its own width inside flex rows */
`;

const StyledSelect = styled(Select)`
  .Select__control {
    border-radius: 12px;
    border-color: #e5e7eb;
    min-height: 40px;
    box-shadow: none;

    &:hover {
      border-color: #2563eb;
    }

    &--is-focused {
      border-color: #2563eb;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
    }
  }

  .Select__menu {
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .Select__option {
    padding: 10px 14px;
    cursor: pointer;

    &--is-focused {
      background: #f9fafb;
    }

    &--is-selected {
      background: #2563eb;
    }
  }
`;

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
    // Debug log the IDs we're getting
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

  // Auth is now handled by useProtectedPage hook - no manual checkAuth needed

  const getSummary = async (transcript) => {
    if (sound == null || transcript == null) {
      setSummary("Transcript is empty!");
      return;
    }
    const rawSummary = await axios.post(
      "/api/cohere_llm?prompt=" +
        "generate a summary for the following transcript: " +
        transcript
    );
    console.log(rawSummary.data.text);
    setSummary(rawSummary.data.text.trim());
  };

  const getTranslation = async (lang) => {
    try {
      const resp = await axios.post(
        `${translate_config.api_address}${translate_config.route_path}`,
        { lang }
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

  async function urlToDuration(audioURL) {
    const durationSeconds = await getBlobDuration(audioURL);
    console.log("durationSeconds is: ", durationSeconds);
    setDurationSeconds(durationSeconds);
  }

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

  // --- helpers (put above onSubmit* functions) ---
  const getRecordingId = () => {
    const n = Number(docID ?? sound?.id);
    return Number.isFinite(n) ? n : null;
  };

  const getCustomerId = async () => {
    // If you already have customerInfo in this file, use it:
    if (Number.isFinite(Number(customer?.id))) return Number(customer.id);

    // Fallback: look up the customer row by the current auth user
    const { data: auth } = await supabase.auth.getUser();
    const authId = auth?.user?.id; // uuid
    if (!authId) return null;

    // Adjust column/table names if yours differ
    const { data, error } = await supabase
      .from("customers")
      .select("id")
      .eq("auth_user_id", authId)
      .maybeSingle();

    if (error) throw error;
    return Number.isFinite(Number(data?.id)) ? Number(data.id) : null;
  };

  const getUserId = async () => {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  };

  const resolveRecordingId = () => {
    // Check both docID from Redux and sound.id, prioritizing docID
    const id = docID || sound?.id;
    if (!id) return null;

    console.log("[resolveRecordingId] Using ID:", {
      docID,
      soundId: sound?.id,
      finalId: id,
    });

    // Ensure it's a valid number
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
        })`
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
        .from(tableName) // should be "mic_recordings"
        .update({ file_name: nameTrimmed })
        .eq("id", idStr)
        .select("id,file_name"); // returns [] if 0 rows matched

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
        })`
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

  return (
    <PageContainer>
      <TopBar>
        <div>
          <Title>Edit Recording</Title>
          <Notice>For best results, play the recording on Chrome</Notice>
        </div>
        <BackButton onClick={() => router.push("/dashboard")}>
          ← Back to Dashboard
        </BackButton>
      </TopBar>

      <MainGrid>
        <AudioPlayerCard delay="0ms">
          <div className="audioplayer-container">
            <Slider percentage={percentage} onChange={onChange} />
            <audio
              ref={audioRef}
              key={audioURL} // force a clean reload when URL changes
              crossOrigin="anonymous" // CORS fetch under COEP
              preload="metadata"
              src={audioURL || undefined} // never pass an empty string
              onLoadedMetadata={(e) => {
                const d = e.currentTarget.duration || 0;
                setDurationSeconds(d); // use your duration state setter
              }}
              onTimeUpdate={(e) => {
                const t = e.currentTarget.currentTime || 0;
                const d = e.currentTarget.duration || 1;
                setCurrentTime(t); // use your currentTime setter
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
        </AudioPlayerCard>

        {isAudioSelected ? (
          <>
            <EditorPanel delay="60ms">
              <Label htmlFor="editName">File Name</Label>
              <TextArea
                id="editName"
                name="editName"
                onChange={handleEditName}
                value={editName}
                isFileName
                placeholder="Edit the filename..."
              />
              <ActionRow>
                <RenameButton
                  onClick={() => onSubmitRenameName(editName)}
                  isLoading={isLoading}
                  disabled={isLoading || !editName?.trim()}
                  aria-busy={isLoading}
                >
                  Rename
                </RenameButton>
              </ActionRow>
            </EditorPanel>

            <EditorPanel delay="120ms">
              <Label htmlFor="editTranscript">Transcript</Label>
              <TextArea
                id="editTranscript"
                name="editTranscript"
                onChange={handleEditTranscript}
                value={editTranscript}
                isTranscript
                placeholder="Edit the transcript"
              />
              <ActionRow>
                <PrimaryButton
                  onClick={() => onSubmitRenameTranscript(editTranscript)}
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  Edit Transcript
                </PrimaryButton>
              </ActionRow>
            </EditorPanel>

            {/*<EditorPanel delay="180ms">
              <Label>Translation</Label>
              <StyledSelect
                placeholder="Select Language"
                value={languages.find((obj) => obj.value === language)}
                options={languages}
                onChange={handleChange}
              />
              {language && (
                <div style={{ marginTop: 20 }}>
                  <div>Selected: {language}</div>
                  <ActionRow>
                    <PrimaryButton onClick={() => getTranslation(language)}>
                      Translate
                    </PrimaryButton>
                  </ActionRow>
                  {translation && <p>{translation}</p>}
                </div>
              )}
            </EditorPanel>*/}

            {/*<EditorPanel delay="240ms">
              <Label>Summary</Label>
              <ActionRow>
                <PrimaryButton
                  onClick={() => getSummary(sound.full_transcript)}
                >
                  Generate Summary
                </PrimaryButton>
                <PrimaryButton onClick={() => router.push("/chatbot")}>
                  Go to ChatBot
                </PrimaryButton>
              </ActionRow>
              {summary && <p style={{ marginTop: 12 }}>{summary}</p>}
            </EditorPanel>*/}
          </>
        ) : (
          <Card>
            <Title>No Audio Selected</Title>
          </Card>
        )}
      </MainGrid>
    </PageContainer>
  );
}
