import * as React from "react";
import { useEffect, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateRecordingList } from "../redux/recording/actions";
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
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";

const PhoneRecording = () => {
  const [transcript, setTranscript] = React.useState("");
  const [callRecordingData, setCallRecordingData] = React.useState(undefined);

  const supabase = useSupabaseClient();
  const user = useUser();
  const { subscribe, unSubscribeAll, pubnubDispatch } = usePubnub();

  React.useEffect(() => {
    pubnubDispatch({ type: "SET_TRANSCRIPT_CALLBACK", payload: setTranscript });
    pubnubDispatch({
      type: "SET_CALL_RECORDING_SAVED_CALLBACK",
      payload: setCallRecordingData,
    });
  }, [pubnubDispatch]);

  const router = useRouter();

  const [filename, setFilename] = React.useState("");
  const [liveTranscript, setLiveTranscript] = React.useState("");

  const [isTranscribing, setIsTranscribing] = React.useState(false);
  //const [isDialed, setIsDialed] = React.useState(false);
  const [callControlID, setCallControlID] = React.useState(null);
  const [callStatus, setCallStatus] = React.useState();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [customer, setCustomer] = useState(null);

  const dispatch = useDispatch();
  const recordingList = useSelector(
    (state) => state.recordingReducer.recordingList
  );
  //const recording = useSelector((state) => state.recordingReducer.recording);
  const isRecording = useSelector(
    (state) => state.recordingReducer.isRecording
  );

  // newly added supabase code...to check user authentication state for now.
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
        if (!subscriptionResponse) {
          setIsSubscribed(false);
          setSubscriptionInfo(null);
        } else {
          if (!subscriptionResponse.data[0]) {
            setIsSubscribed(false);
            setSubscriptionInfo(null);
          } else {
            console.log(
              "subscriptionResponse is: ",
              subscriptionResponse.data[0].stripe_product_name
            );
            setIsSubscribed(true);
            setSubscriptionInfo(
              subscriptionResponse.data[0].stripe_product_name
            );
          }
        }
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
    //console.log("Current user is: ", currentUser);
    checkAuth(user);
    //getSubscriptionsInfo();
  }, [checkAuth, user]);

  const startRecordingAudio = async () => {
    // call the "dial" API endpoint
    const to = "+16472181328";
    const from = "+18885390817";
    const res_dial = await axios.get(
      `/api/dial?from=${encodeURIComponent(from)}&to=${encodeURIComponent(
        to
      )}&customer_id=${customer.id}`
    );
    console.log("call_control_id is: ", res_dial.data);
    //console.log("callStatus is: ", res_dial.status);
    setCallControlID(res_dial.data);
    subscribe(res_dial.data);
    //setIsDialed(true);
    //setCallStatus(res_dial.status);
    setIsTranscribing(true);
    setTranscript("");
  };

  //Trigger call (or telnyx action) -> send event data to webhook -> webhook is ngrok -> tunnel data to port -> next app is listening on port

  const stopRecordingAudio = useCallback(async () => {
    setIsTranscribing(false);
    //setTranscript("");
    unSubscribeAll();
  }, [unSubscribeAll]);

  useEffect(() => {
    if (callRecordingData !== undefined) {
      stopRecordingAudio();
      if (callRecordingData === null) {
        alert("Unable to save call recording :(");
      }
    }
  }, [callRecordingData, stopRecordingAudio]);

  // old firebase code
  async function renameRecord() {
    // this I have to work through. get the call recording URL. Then update
    // supabase record with filename and duration. That function is my focus now.
    // also the transcript...find a way to save that.
    if (!filename && filename.length < 1) {
      alert("Filename can not be empty!");
      return;
    }

    console.log("filename", filename);
    // save to supabase
    setCallRecordingData(undefined);

    //const durationSeconds = await getBlobDuration(mediaBlobUrl); // or it could just be mediaBlobUrl
    const callRecordingResponse = await supabase
      .from("call_recordings")
      .select("*")
      .eq("telnyx_call_control_id", callControlID);
    if (callRecordingResponse.error) {
      console.log(
        "durationMillisResponse error: ",
        callRecordingResponse.error
      );
    }
    if (callRecordingResponse.data) {
      console.log(
        "durationMillisResponse data durationMillis: ",
        callRecordingResponse.data[0].durationMillis
      );
    }
    const durationMillis = callRecordingResponse.data[0].durationMillis;
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
      filepath: callRecordingResponse.data[0].mp3_file_name,
      filename,
      recordingdate: recordingdate,
      duration: duration,
      //duration: durationSeconds,
      transcript: transcript,
    });
    //newRecordingList.reverse()   //sorting
    //props.setRecordinglistProp(newRecordingList);
    dispatch(updateRecordingList(newRecordingList));
    console.log("In Phone Recording, currentUser is: ", customer);
    console.log("In Phone Recording, newRecordingList is: ", newRecordingList); // only returns list on same page
    // here, update the record with filename, duration (formatted) and transcript
    const updateCallResponse = await supabase
      .from("call_recordings")
      .update({ file_name: filename, duration, full_transcript: transcript })
      .eq("telnyx_call_control_id", callControlID)
      .select();
    if (updateCallResponse.error) console.log(updateCallResponse.error);
    if (updateCallResponse.data) console.log(updateCallResponse.data[0]);
    // Reset the field
    setFilename("");
    // We can go to library tab
    router.push("/dashboard");
  }

  function renderView() {
    //if (status === "recording") { // to be replaced with data.event_type from pages/api/telnyx_events.js upon publish
    // while recording or not recording yet

    if (callRecordingData) {
      return (
        <div className="title">
          <input
            value={filename}
            name="filename"
            onChange={(e) => setFilename(e.target.value)}
          />
          <button onClick={renameRecord}>Rename</button>
          <div>URL: {callRecordingData.url}</div>
        </div>
      );
    }

    if (isTranscribing) {
      return (
        <div className="title">
          <button onClick={stopRecordingAudio}>Stop Recording</button>
          <h1>Transcript below</h1>
          <p>{transcript}</p>
        </div>
      );
    } else {
      return (
        <div className="title">
          <button onClick={startRecordingAudio}>Start Recording</button>
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
      <style jsx>{signInStyles}</style>
    </div>
  );
};

export default PhoneRecording;
