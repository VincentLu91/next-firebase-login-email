import { useReactMediaRecorder } from "react-media-recorder";
import * as React from "react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateRecordingList, setRecordURI } from "../redux/recording/actions";
import moment from "moment";
import getBlobDuration from "get-blob-duration";
import { setCurrentUser } from "../redux/user/actions";
import RecordRTC, { StereoAudioRecorder } from "recordrtc"; // only run on the browser
import { useRouter } from "next/router";
import signInStyles from "../styles/signinStyles";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import fileToArrayBuffer from "file2arraybuffer";

const Recording = () => {
  const router = useRouter();
  const user = useUser();
  const supabase = useSupabaseClient();

  const { status, startRecording, stopRecording, mediaBlobUrl } =
    useReactMediaRecorder({ audio: true }); // could also put video and screen props as true!

  const [filename, setFilename] = React.useState("");
  const [liveTranscript, setLiveTranscript] = React.useState("");
  const [transcript, setTranscript] = React.useState("");
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const dispatch = useDispatch();
  const recordingList = useSelector(
    (state) => state.recordingReducer.recordingList
  );
  //const recording = useSelector((state) => state.recordingReducer.recording);
  const isRecording = useSelector(
    (state) => state.recordingReducer.isRecording
  );
  const recordURI = useSelector((state) => state.recordingReducer.recordURI);
  console.log("Internal Recording isRecording: ", isRecording);

  let recorder;

  const uploadAudio = async (audioData) => {
    let uriParts = mediaBlobUrl.split(".").toString().replace("//", "");
    const fileType = uriParts[uriParts.length - 1];
    const file_name =
      audioData.file_name + "_" + user.id + `${Date.now()}.${fileType}`;
    audioData.original_file_name = file_name;
    console.log("FILE NAME", file_name);
    audioData.file_name = file_name;

    try {
      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
          try {
            resolve(xhr.response);
          } catch (error) {
            console.log("error:", error);
          }
        };
        xhr.onerror = (e) => {
          console.log(e);
          reject(new TypeError("Network request failed"));
        };
        xhr.responseType = "blob";
        xhr.open("GET", mediaBlobUrl, true);
        xhr.send(null);
      });
      if (blob != null) {
        console.log("blob is: ", blob);
        const arrayBuffer = await blob.arrayBuffer();
        console.log("arrayBuffer is: ", arrayBuffer);
        const blobResponse = await supabase.storage
          .from("recreate-ai-storage-bucket")
          .upload(file_name, arrayBuffer, {
            // works with blob as well but it's not supported in React Native
            contentType: "audio/mp3",
          });
        if (blobResponse.error) {
          console.log("blobResponse Error: ", blobResponse.error);
        }
        if (blobResponse.data) {
          console.log("blobResponse data: ", blobResponse.data);
          let micRecordingResponse = await supabase
            .from("mic_recordings")
            .insert([audioData])
            .select();
          if (micRecordingResponse.error) {
            console.log("Cannot insert, see error: ");
            console.log(micRecordingResponse.error);
          }
          if (micRecordingResponse.data) {
            console.log("micRecording Success!");
            console.log(micRecordingResponse.data);
          }
        }
      } else {
        console.log("erroor with blob");
      }
    } catch (error) {
      console.log("error:", error);
    }
  };

  const startRecordingAudio = async () => {
    startRecording();
    // call transcription function later
    setIsTranscribing(true);
    const response = await fetch("/api/token");
    const data = await response.json();
    console.log("DATOKEN", data);
    if (data.error) {
      alert(data.error);
    }

    const { token } = data;

    if (!window.socket) {
      // establish wss with AssemblyAI (AAI) at 16000 sample rate
      window.socket = await new WebSocket(
        `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`
      );
    }

    // handle incoming messages to display transcription to the DOM
    const texts = {};
    window.socket.onmessage = (message) => {
      console.log("Entering onmessage");
      console.log("onwindow.socket message is: ", message);
      let msg = "";
      const res = JSON.parse(message.data);
      texts[res.audio_start] = res.text;
      const keys = Object.keys(texts);
      keys.sort((a, b) => a - b);
      for (const key of keys) {
        if (texts[key]) {
          msg += ` ${texts[key]}`;
        }
      }
      console.log("Leaving onmessage. msg is: ", msg);
      setLiveTranscript(msg);
      console.log("Opening. window.socket is: ", window.socket);
    };

    window.socket.onerror = (event) => {
      console.error(event);
      window.socket.close();
      setIsTranscribing(false);
    };

    /*window.socket.onclose = (event) => {
      console.log(event);
      //window.socket = null;
      setIsTranscribing(false);
    };*/

    window.socket.onopen = (e) => {
      // solution to reopen websocket instance:
      // https://stackoverflow.com/questions/47180904/websocket-even-after-firing-onopen-event-still-in-connecting-state
      if (e.target.readyState !== WebSocket.OPEN) return;
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          recorder = new RecordRTC(stream, {
            type: "audio",
            mimeType: "audio/webm;codecs=pcm", // endpoint requires 16bit PCM audio
            recorderType: StereoAudioRecorder,
            timeSlice: 250, // set 250 ms intervals of data that sends to AAI
            desiredSampRate: 16000,
            numberOfAudioChannels: 1, // real-time requires only one channel
            bufferSize: 4096,
            audioBitsPerSecond: 128000,
            ondataavailable: (blob) => {
              const reader = new FileReader();
              reader.onload = () => {
                const base64data = reader.result;

                // audio data must be sent as a base64 encoded string
                //if (window.socket) {
                //window.socket.send(

                e.target.send(
                  JSON.stringify({
                    audio_data: base64data.split("base64,")[1],
                  })
                );
                //}
              };
              reader.readAsDataURL(blob);
            },
          });

          recorder.startRecording();
        })
        .catch((err) => console.error(err));
    };
  };

  async function stopRecordingAudio() {
    stopRecording();
    setIsTranscribing(false);
    setTranscript(liveTranscript);
  }

  async function renameRecord() {
    if (!filename && filename.length < 1) {
      alert("Filename can not be empty!");
      return;
    }
    setRecordURI(mediaBlobUrl);

    const durationSeconds = await getBlobDuration(mediaBlobUrl); // or it could just be mediaBlobUrl
    const durationMillis = durationSeconds * 1000;
    console.log("durationSeconds is: ", durationSeconds);
    const momentduration = moment.duration(durationMillis);
    let duration = moment
      .utc(momentduration.as("milliseconds"))
      .format("HH:mm:ss");
    if (momentduration.hours() === 0) {
      duration = moment.utc(momentduration.as("milliseconds")).format("mm:ss");
    }
    const recordingdate = moment().format("MMMM Do YYYY");
    const newRecordingList = [...recordingList];
    newRecordingList.push({
      filepath: mediaBlobUrl,
      filename,
      recordingdate: recordingdate,
      duration: duration,
      transcript: transcript,
    });

    let customerInfo = await supabase
      .from("customers")
      .select("*")
      .eq("email_address", user.email);

    //newRecordingList.reverse()   //sorting
    //props.setRecordinglistProp(newRecordingList);
    dispatch(updateRecordingList(newRecordingList));
    console.log("In Internal Recording, currentUser is: ", user);
    const audioData = {
      //user: currentUser,
      customer_id: customerInfo.data[0].id,
      file_name: filename,
      //recordingdate: recordingdate,
      duration: duration,
      //duration: durationSeconds,
      full_transcript: transcript,
    };
    uploadAudio(audioData);

    // Reset the field
    setFilename("");
    dispatch(setRecordURI(null));
    //alert("entered..."); // if I hold the alert for too long, the websocket will error out

    // We can go to library tab
    router.push("/dashboard");
  }

  function renderView() {
    if (status === "recording" || status === "idle") {
      // while recording or not recording yet
      if (isTranscribing) {
        return (
          <div className="title">
            {<p>{status}</p>}
            <button onClick={stopRecordingAudio}>Stop Recording</button>
            {/*<video src={mediaBlobUrl} controls autoPlay loop />*/}
            <h1>Transcript below</h1>
            <p>{liveTranscript}</p>
          </div>
        );
      } else {
        return (
          <div className="title">
            {<p>{status}</p>}
            <button onClick={startRecordingAudio}>Start Recording</button>
            {/*<video src={mediaBlobUrl} controls autoPlay loop />*/}
            <h1>Transcript below</h1>
          </div>
        );
      }
    }
    if (status === "stopped") {
      // finished recording
      return (
        <div className="title">
          <p>{mediaBlobUrl}</p>
          <p>recordURI is: {recordURI}</p>
          <input
            value={filename}
            name="filename"
            onChange={(e) => setFilename(e.target.value)}
          />
          <button onClick={renameRecord}>Rename</button>
        </div>
      );
    }
  }

  return (
    <div
      style={{
        flexDirection: "row",
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <h2>For best results, record audio on Chrome</h2>
      <button onClick={() => router.push("/dashboard")}>
        Back to Dashboard
      </button>
      {renderView()}
      <style jsx>{signInStyles}</style>
    </div>
  );
};

export default Recording;
