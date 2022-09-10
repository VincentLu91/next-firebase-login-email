import { useEffect, useState, useRef } from "react";
import Slider from "../components/slider/Slider";
import ControlPanel from "../components/controls/ControlPanel";
import { useDispatch, useSelector } from "react-redux";
import { storage, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { setCurrentUser } from "../redux/user/actions";
import { ref, getDownloadURL } from "firebase/storage";
import getBlobDuration from "get-blob-duration";
// import trainML's config code
import summarize_config from "../pages/api/summarize_config";
import translate_config from "../pages/api/translate_config";
import axios from "axios";
import { useRouter } from "next/router";
import Select from "react-select";

import audioPlayerStyles from "../styles/audioPlayerStyles";

function AudioPlayer() {
  const router = useRouter();
  const dispatch = useDispatch();
  const sound = useSelector((state) => state.recordingReducer.sound);
  const [percentage, setPercentage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioURL, setAudioURL] = useState(null);
  const [isAudioSelected, setIsAudioSelected] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);

  const [summary, setSummary] = useState(null);
  const [translation, setTranslation] = useState(null);
  const [language, setLanguage] = useState(null);

  const getSummary = async (transcript) => {
    if (sound == null || transcript == null) {
      setSummary("Transcript is empty!");
      return;
    }
    try {
      const resp = await axios.post(
        `${summarize_config.api_address}${summarize_config.route_path}`,
        {
          transcript,
        }
      );
      const summary_text = resp.data["summary_text"];
      console.log(summary_text);
      //console.log(typeof summary_text);
      setSummary(summary_text);
    } catch (error) {
      if (error.response) {
        console.log(error.response.status);
        console.log(error.response);
      } else {
        console.log(error);
      }
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

  async function loadRecording(authUser, sound) {
    /*const pathReference = ref(
      storage,
      `recordings/${authUser.uid}/files/${sound.fileName}`
    );*/
    const pathReference = ref(storage, sound.originalFilename);
    getDownloadURL(pathReference)
      .then((url) => {
        // Insert url into an <img> tag to "download"
        console.log("Audio downloaded: ", url);
        setAudioURL(url);
      })
      .catch((error) => {
        // A full list of error codes is available at
        // https://firebase.google.com/docs/storage/web/handle-errors
        switch (error.code) {
          case "storage/object-not-found":
            // File doesn't exist
            break;
          case "storage/unauthorized":
            // User doesn't have permission to access the object
            break;
          case "storage/canceled":
            // User canceled the upload
            break;

          // ...

          case "storage/unknown":
            // Unknown error occurred, inspect the server response
            break;
          default:
            break;
        }
      });
  }

  async function urlToDuration(audioURL) {
    const durationSeconds = await getBlobDuration(audioURL);
    console.log("durationSeconds is: ", durationSeconds);
    setDurationSeconds(durationSeconds);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      console.log("authUser is: ", authUser); // uid
      if (authUser) {
        dispatch(setCurrentUser(authUser));
        if (sound) {
          loadRecording(authUser, sound);
          setIsAudioSelected(true);
        } else {
          setIsAudioSelected(false);
        }
      }
    });

    return unsubscribe;
  }, [dispatch, sound]);

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

  return (
    <div>
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
          <h1 className="h1-center-bold">{sound.fileName}</h1>
          <h1 className="h1-center-bold">Transcript:</h1>
          <h1 className="h1-center-bold">{sound.transcript}</h1>
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
            <button onClick={() => getSummary(sound.transcript)}>
              Summary
            </button>
            <h2>Summary is: {summary}</h2>
          </div>
        </div>
      )}

      {language && (
        <div style={{ marginTop: 20, lineHeight: "25px" }}>
          <div>
            <b>Selected Value: </b> {language}
          </div>
          <div>
            <button onClick={() => getTranslation(language)}>Translate</button>
            <h2>Translation is: {translation}</h2>
          </div>
        </div>
      )}
      <style jsx>{audioPlayerStyles}</style>
    </div>
  );
}

export default AudioPlayer;
