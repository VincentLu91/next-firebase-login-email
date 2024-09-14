import { useEffect, useState, useRef, useCallback } from "react";
import Slider from "../components/slider/Slider";
import ControlPanel from "../components/controls/ControlPanel";
import { useDispatch, useSelector } from "react-redux";
import getBlobDuration from "get-blob-duration";
// import trainML's config code
import summarize_config from "../pages/api/summarize_config";
import translate_config from "../pages/api/translate_config";
import axios from "axios";
import { useRouter } from "next/router";
import Select from "react-select";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { setSound } from "../redux/recording/actions";

import audioPlayerStyles from "../styles/audioPlayerStyles";

function EditRecordingFile() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useUser();
  const supabase = useSupabaseClient();
  const sound = useSelector((state) => state.recordingReducer.sound);
  const [percentage, setPercentage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioURL, setAudioURL] = useState(null);
  const [isAudioSelected, setIsAudioSelected] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [customer, setCustomer] = useState(null);

  const [summary, setSummary] = useState(null);
  const [translation, setTranslation] = useState(null);
  const [language, setLanguage] = useState(null);
  const [editName, setEditName] = useState(sound?.file_name);
  const [editTranscript, setEditTranscript] = useState(sound?.full_transcript);
  const docID = useSelector((state) => state.recordingReducer.docID);
  const tableName = useSelector((state) => state.recordingReducer.tableName);

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
        // the below could be commented out for now, because users who cancel plan should still access recordings
        /*console.log(
          "subscriptionResponse is: ",
          subscriptionResponse.data[0].stripe_product_name
        );*/
      } else {
        // User is signed out
        console.log(
          "The user is inauthenticated, redirecting back to signin page"
        );
        router.push("/signin");
      }
    },
    [router, supabase]
  );

  useEffect(() => {
    checkAuth(user);
  }, [checkAuth, user]);

  const getSummary = async (transcript) => {
    if (sound == null || transcript == null) {
      setSummary("Transcript is empty!");
      return;
    } else {
      //alert(typeof JSON.stringify(response.data['choices'][0]['text'].trim));
      const rawSummary = await axios.post(
        "/api/cohere_llm?prompt=" +
          "generate a summary for the following transcript: " +
          transcript
      );
      console.log(rawSummary.data.text);
      setSummary(rawSummary.data.text.trim());
    }
  };

  const getTranslation = async (lang) => {
    try {
      const resp = await axios.post(
        `${translate_config.api_address}${translate_config.route_path}`,
        {
          lang,
        }
      );
      const translated_text = resp.data["translated_text"];
      //console.log("Translated text is: ", translated_text);
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
    console.log("authUser is: ", customer); // uid
    if (customer) {
      if (sound) {
        const uri = supabase.storage
          .from("recreate-ai-storage-bucket")
          .getPublicUrl(sound.original_file_name);
        console.log("uri is: ", uri.data.publicUrl);
        setAudioURL(uri.data.publicUrl);
        setIsAudioSelected(true);
      } else {
        setIsAudioSelected(false);
      }
    }
  }, [dispatch, sound, customer, supabase]);

  const audioRef = useRef();

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
    console.log("currentTime is: ", time);
  };

  const languages = [
    { value: "chinese", label: "Chinese" },
    { value: "german", label: "German" },
  ];

  // handle onChange event of the dropdown
  const handleChange = (e) => {
    setLanguage(e.label);
    console.log("Language selected: ", e.value);
  };

  const handleEditName = (e) => {
    setEditName(e.target.value);
    console.log("editName: ", e.target.value);
  };

  const handleEditTranscript = (e) => {
    setEditTranscript(e.target.value);
    console.log("editName: ", e.target.value);
  };

  const onSubmitRenameName = async (editName) => {
    const fileNameRef = await supabase
      .from(tableName)
      .update({ file_name: editName })
      .eq("id", docID)
      .select();
    alert("You just edited filename");
  };

  const onSubmitRenameTranscript = async (editTranscript) => {
    const transcriptRef = await supabase
      .from(tableName)
      .update({ full_transcript: editTranscript })
      .eq("id", docID)
      .select();
    alert("You just edited transcript");
  };

  return (
    <div>
      <h2>For best results, play the recording on Chrome</h2>
      <button onClick={() => router.push("/dashboard")}>
        Back to Dashboard
      </button>
      <div className="audioplayer-body">
        <div className="audioplayer-container">
          <h1 className="h1-center-bold">Audio Player</h1>
          <Slider percentage={percentage} onChange={onChange} />
          <audio
            ref={audioRef}
            onTimeUpdate={getCurrDuration}
            onLoadedData={(e) => {
              urlToDuration(audioURL);
              console.log("e.currentTarget is: ", e.currentTarget);
            }}
            src={audioURL}
          ></audio>
          <ControlPanel
            play={play}
            isPlaying={isPlaying}
            duration={durationSeconds} // this is the duration of the audio file in seconds
            currentTime={currentTime}
          />
        </div>
      </div>
      {isAudioSelected ? (
        <>
          <textarea
            type="text"
            id="editName"
            name="editName"
            onChange={handleEditName}
            value={editName}
            cols="80"
            rows="15"
            placeholder="Edit the filename..."
            className="border-2 border-gray-300 rounded-md placeholder:pl-0.5"
          />
          <button onClick={() => onSubmitRenameName(editName)}>Rename</button>
          <textarea
            type="text"
            id="editTranscript"
            name="editTranscript"
            onChange={handleEditTranscript}
            value={editTranscript}
            cols="80"
            rows="15"
            placeholder="Edit the transcript"
            className="border-2 border-gray-300 rounded-md placeholder:pl-0.5"
          />
          <button onClick={() => onSubmitRenameTranscript(editTranscript)}>
            Edit Transcript
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
        value={languages.find((obj) => obj.value === language)} // set selected value
        options={languages} // set list of the data
        onChange={handleChange} // assign onChange function
      />

      {sound && (
        <div style={{ marginTop: 20, lineHeight: "25px" }}>
          <div>
            <button
              onClick={() => {
                console.log("placeholder getSummary()");
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
            <button
              onClick={
                () =>
                  console.log(
                    "placeholder getTranslation()"
                  ) /*getTranslation(language)*/
              }
            >
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

export default EditRecordingFile;
