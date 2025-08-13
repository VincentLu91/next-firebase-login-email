import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Slider from "../components/slider/Slider";
import ControlPanel from "../components/controls/ControlPanel";
import { useDispatch, useSelector } from "react-redux";
// import trainML's config code
import summarize_config from "../pages/api/summarize_config";
import translate_config from "../pages/api/translate_config";
import axios from "axios";
import { useRouter } from "next/router";
import Select from "react-select";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { setSound, setDocID, setTableName } from "../redux/recording/actions";

import audioPlayerStyles from "../styles/audioPlayerStyles";

// Fast WAV duration from header (~4KB), no full decode
async function getWavDurationFromHeader(url) {
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-4095" } });
    if (!res.ok) return NaN;
    const buf = await res.arrayBuffer();
    const dv = new DataView(buf);
    const str = (o, n) => String.fromCharCode(...new Uint8Array(buf, o, n));

    let off = 12; // skip "RIFF....WAVE"
    let byteRate = 0;
    let dataSize = 0;

    while (off + 8 <= dv.byteLength) {
      const id = str(off, 4);
      const size = dv.getUint32(off + 4, true);
      off += 8;

      if (id === "fmt ") {
        if (off + 12 <= dv.byteLength) byteRate = dv.getUint32(off + 8, true);
      } else if (id === "data") {
        dataSize = size;
        break;
      }
      off += size;
    }
    if (byteRate > 0 && dataSize > 0) return dataSize / byteRate;
  } catch {}
  return NaN;
}

function AudioPlayer() {
  const audioRef = useRef();
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

  const [fallbackDur, setFallbackDur] = useState(null);

  // If URL is a WAV, compute a fallback duration once
  useEffect(() => {
    if (!audioURL) return;
    const isWav = /\.wav($|\?|#)/i.test(audioURL);
    if (!isWav) return;
    let cancelled = false;
    getWavDurationFromHeader(audioURL).then((d) => {
      if (!cancelled && Number.isFinite(d) && d > 0) setFallbackDur(d);
    });
    return () => {
      cancelled = true;
    };
  }, [audioURL]);

  // Use the best available duration
  const effectiveDuration = useMemo(() => {
    const el = audioRef.current;
    const elDur = Number.isFinite(el?.duration) ? el.duration : 0;
    if (elDur > 0) return elDur;
    if (durationSeconds > 0) return durationSeconds;
    if (Number.isFinite(fallbackDur) && fallbackDur > 0) return fallbackDur;
    return 0;
  }, [audioRef, durationSeconds, fallbackDur]);

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Force a reload so metadata re-fires after error overlays / fast refresh
    try {
      audio.load();
    } catch (e) {}
  }, [audioURL]);

  const onChange = (e) => {
    const sliderVal = Number(e.target.value); // 0..100
    const audio = audioRef.current;
    const d = effectiveDuration;

    // Always let the UI move
    setPercentage(sliderVal);

    // Seek when we know a duration; otherwise just reflect a best-guess time
    if (audio && d > 0) {
      const target = (sliderVal / 100) * d;
      try {
        audio.currentTime = target;
      } catch {}
      setCurrentTime(audio.currentTime || target || 0);
    } else {
      const guess = (sliderVal / 100) * (fallbackDur || 0);
      setCurrentTime(Number.isFinite(guess) ? guess : 0);
    }
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
    const el = e.currentTarget;
    const d =
      (Number.isFinite(el.duration) && el.duration) || durationSeconds || 0;
    const t = el.currentTime || 0;

    if (d > 0) {
      const percent = (t / d) * 100;
      setPercentage(Number(percent.toFixed(2)));
    }
    setCurrentTime(Number(t.toFixed(2)));
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

  async function goEditFile(sound) {
    //dispatch(printTranscription(transcription));
    //console.log("Transcription from Library is: ", transcription);
    dispatch(setSound(sound));
    // Query by original_file_name which should be unique
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
    console.log("Query results:", { micRenameInfo, callRenameInfo });

    if (micRenameInfo?.data) {
      console.log("Found mic recording:", micRenameInfo.data);
      dispatch(setDocID(micRenameInfo.data.id));
      dispatch(setTableName("mic_recordings"));
      router.push("/editrecordingfile");
      return;
    }

    if (callRenameInfo?.data) {
      console.log("Found call recording:", callRenameInfo.data);
      dispatch(setDocID(callRenameInfo.data.id));
      dispatch(setTableName("call_recordings"));
      router.push("/editrecordingfile");
      return;
    }
    //router.push("/editrecordingfile");
  }

  return (
    <div>
      <h2>For best results, play the recording on Chrome</h2>
      <button onClick={() => router.push("/dashboard")}>
        Back to Dashboard
      </button>
      <div className="audioplayer-body">
        <div className="audioplayer-container">
          <Slider percentage={percentage} onChange={onChange} />
          {(() => {
            const isWav = audioURL && /\.wav($|\?|#)/i.test(audioURL);
            // Safari nudge (harmless elsewhere)
            const fixedSrc =
              audioURL && isWav && !audioURL.includes("#t=")
                ? `${audioURL}#t=0.001`
                : audioURL;

            return (
              <audio
                key={fixedSrc || "no-audio"} // keep your remount behavior
                ref={audioRef}
                preload="auto" // ensure metadata actually loads
                crossOrigin="anonymous" // avoid CORS blocking duration/time
                onTimeUpdate={getCurrDuration}
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  setDurationSeconds(Number.isFinite(d) ? d : 0);
                  setCurrentTime(0);
                  setPercentage(0);
                }}
                onDurationChange={(e) => {
                  const d = e.currentTarget.duration;
                  if (Number.isFinite(d) && d > 0) setDurationSeconds(d);
                }}
                onEnded={() => setIsPlaying(false)}
                onError={() => {
                  if (Number.isFinite(fallbackDur) && fallbackDur > 0) {
                    setDurationSeconds((d) => (d > 0 ? d : fallbackDur));
                  }
                }}
                src={fixedSrc}
              />
            );
          })()}

          <ControlPanel
            play={play}
            isPlaying={isPlaying}
            duration={effectiveDuration}
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

export default AudioPlayer;
