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

  async function urlToDuration(audioUrl) {
    const durationSeconds = await getBlobDuration(audioUrl);
    console.log("durationSeconds is: ", durationSeconds);
    setDurationSeconds(durationSeconds);
  }

  const onChange = (e) => {
    const sliderVal = e.target.value;
    audioRef.current.currentTime =
      (durationSeconds / 100) * parseFloat(sliderVal).toFixed(2);
    setPercentage(sliderVal);
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
      <h2>For best results, play the recording on Chrome</h2>
      <button onClick={() => router.push("/dashboard")}>
        Back to Dashboard
      </button>

      <div className="audioplayer-body">
        <div className="audioplayer-container">
          <Slider onChange={onChange} percentage={percentage} />
          <audio
            ref={audioRef}
            onTimeUpdate={getCurrDuration}
            onLoadedData={(e) => {
              urlToDuration(audioUrl);
            }}
            src={audioUrl}
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

      {isAudioSelected ? (
        <>
          <h1 className="h1-center-bold">{sound?.file_name}</h1>
          <h1 className="h1-center-bold">Transcript:</h1>
          <h1 className="h1-center-bold">{sound?.full_transcript}</h1>
          <button onClick={() => goEditFile(sound)}>
            Edit Filename and transcript
          </button>
        </>
      ) : (
        <>
          <h1 className="h1-center-bold">no audio selected</h1>
        </>
      )}

      <h1 className="h1-center-bold">
        outside of audio player: select translation and summary
      </h1>
      <Select
        placeholder="Select Option"
        value={languages.find((obj) => obj.value === language)}
        options={languages}
        onChange={handleChange}
      />

      {sound && (
        <div style={{ marginTop: 20, lineHeight: "25px" }}>
          <div>
            <button
              onClick={() => {
                getSummary(sound.full_transcript);
              }}
            >
              Summary
            </button>
            <h2>Summary is: {summary}</h2>
            <button onClick={() => router.push("/chatbot")}>
              Go to ChatBot
            </button>
          </div>
        </div>
      )}

      {language && (
        <div style={{ marginTop: 20, lineHeight: "25px" }}>
          <div>
            <b>Selected Value: </b> {language}
          </div>
          <div>
            <button onClick={() => console.log("placeholder getTranslation()")}>
              Translate
            </button>
            <h2>Translation is: {translation}</h2>
          </div>
        </div>
      )}

      <style jsx>{audioPlayerStyles}</style>
    </div>
  );
}
