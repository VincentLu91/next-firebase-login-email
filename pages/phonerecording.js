import * as React from "react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateRecordingList, setRecordURI } from "../redux/recording/actions";
import moment from "moment";
import getBlobDuration from "get-blob-duration";
import db, { storage, auth } from "../firebase";
import { uploadBytes, ref } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import { setCurrentUser } from "../redux/user/actions";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import signInStyles from "../styles/signinStyles";
//import Telnyx from "telnyx";
import dynamic from "next/dynamic";
import axios from "axios";
import { usePubnub } from "../contexts/pubnub";

const PhoneRecording = () => {
  const [transcript, setTranscript] = React.useState("");
  const { subscribe, unSubscribeAll, pubnubDispatch } = usePubnub();

  React.useEffect(() => {
    pubnubDispatch({ type: "SET_TRANSCRIPT_CALLBACK", payload: setTranscript });
  }, [pubnubDispatch]);

  const router = useRouter();

  const [filename, setFilename] = React.useState("");
  const [liveTranscript, setLiveTranscript] = React.useState("");

  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const [isDialed, setIsDialed] = React.useState(false);
  const [call_control_id, setCallControlID] = React.useState(null);
  const [callStatus, setCallStatus] = React.useState();
  const dispatch = useDispatch();
  const recordingList = useSelector(
    (state) => state.recordingReducer.recordingList
  );
  //const recording = useSelector((state) => state.recordingReducer.recording);
  const isRecording = useSelector(
    (state) => state.recordingReducer.isRecording
  );
  const recordURI = useSelector((state) => state.recordingReducer.recordURI);
  const currentUser = useSelector((state) => state.user.currentUser);
  console.log("Phone Recording CurrentUser: >>>>>>>>>>>>>>>>>>>>", currentUser);
  console.log("Phone Recording isRecording: ", isRecording);
  console.log("Firebase storage object: ", storage._bucket);

  // this is to check for the userID upon page refresh in the event it gets wiped out.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      console.log(authUser); // uid
      if (authUser) {
        dispatch(setCurrentUser(authUser));
      }
    });

    return unsubscribe;
  }, [dispatch]);

  /*const uploadAudio = async (audioData) => {
    //const uriParts = recordURI.split(".");
    let uriParts = mediaBlobUrl.split(".").toString().replace("//", "");
    //uriParts = uriParts.toString().replace("//", "");
    //const uriParts = mediaBlobUrl.split(".").replace(/\//g, "");
    const fileType = uriParts[uriParts.length - 1];
    const fileName =
      //audioData.filename + "_" + currentUser + `${Date.now()}.${fileType}`;
      audioData.filename + "_" + currentUser.uid + `${Date.now()}.${fileType}`;
    audioData.originalFilename = fileName;
    console.log("FILE NAME", fileName);
    audioData.fileName = fileName;

    //delete filename
    delete audioData.filename;

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
        const storageRef = ref(storage, fileName);
        uploadBytes(storageRef, blob).then((snapshot) => {
          const docRef = addDoc(
            //collection(db, `customers/${userContext.user.uid}/checkout_sessions`),
            //collection(db, `customers/${user.uid}/checkout_sessions`),
            collection(db, `recordings/${currentUser.uid}/files`),
            audioData
          );
          console.log("snapshot is: ", snapshot);
        });
      } else {
        console.log("erroor with blob");
      }
    } catch (error) {
      console.log("error:", error);
    }
  };*/

  const telnyxDial = async () => {
    // call the "dial" API endpoint
    const to = "+16472181328";
    const from = "+18885390817";
    const res_dial = await axios.get(
      `/api/dial?from=${encodeURIComponent(from)}&to=${encodeURIComponent(
        to
      )}&uid=${currentUser.uid}`
    );
    console.log("call_control_id is: ", res_dial.data);
    console.log("callStatus is: ", res_dial.status);
    setCallControlID(res_dial.data);
    subscribe(res_dial.data);
    setIsDialed(true);
    setCallStatus(res_dial.status);
  };

  const startRecordingAudio = async () => {
    //telnyxCallRecording();
    telnyxDial();
    //const telnyx_events = await axios.get(`/api/telnyx_events`);
  };

  //Trigger call (or telnyx action) -> send event data to webhook -> webhook is ngrok -> tunnel data to port -> next app is listening on port

  async function stopRecordingAudio() {
    setIsTranscribing(false);
    setTranscript(liveTranscript);
  }

  /*async function renameRecord() {
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
      //duration: durationSeconds,
      transcript: transcript,
    });

    //newRecordingList.reverse()   //sorting
    //props.setRecordinglistProp(newRecordingList);
    dispatch(updateRecordingList(newRecordingList));
    console.log("In Phone Recording, currentUser is: ", currentUser);
    const audioData = {
      //user: currentUser,
      user: currentUser.uid,
      filename,
      recordingdate: recordingdate,
      duration: duration,
      //duration: durationSeconds,
      transcript: transcript,
    };
    //uploadAudio(audioData);

    // Reset the field
    setFilename("");
    dispatch(setRecordURI(null));
    //alert("entered..."); // if I hold the alert for too long, the websocket will error out

    // We can go to library tab
    router.push("/dashboard");
  }*/

  const setCallTranscript = (newTranscript) => {
    setTranscript(newTranscript);
  };

  function renderView() {
    //if (status === "recording") { // to be replaced with data.event_type from pages/api/telnyx_events.js upon publish
    // while recording or not recording yet
    if (isTranscribing) {
      return (
        <div className="title">
          <button onClick={stopRecordingAudio}>Stop Recording</button>
          <h1>Transcript below</h1>
          <p>{liveTranscript}</p>
        </div>
      );
    } else {
      return (
        <div className="title">
          <button onClick={startRecordingAudio}>Start Recording</button>
          <h1>Transcript below</h1>
        </div>
      );
    }
    //}
    /*if (status === "stopped") { // to be replaced with data.event_type from pages/api/telnyx_events.js upon publish
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
    }*/
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
      <button
        onClick={() => {
          unSubscribeAll();
        }}
      >
        unsubscribe all
      </button>
      <button onClick={() => router.push("/dashboard")}>
        Back to Dashboard
      </button>
      {renderView()}
      Transcript: {transcript}
      <style jsx>{signInStyles}</style>
    </div>
  );
};

export default PhoneRecording;
