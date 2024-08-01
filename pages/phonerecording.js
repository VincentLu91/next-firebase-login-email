import * as React from "react";
import { useEffect, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  updateRecordingList,
  setCallControlID,
} from "../redux/recording/actions";
import moment from "moment";
import getBlobDuration from "get-blob-duration";
import { setCurrentUser } from "../redux/user/actions";
import { useRouter } from "next/router";
import signInStyles from "../styles/signinStyles";
//import Telnyx from "telnyx";
import dynamic from "next/dynamic";
import axios from "axios";
import { usePubnub } from "../contexts/pubnub";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import PhoneInput from "react-phone-number-input";
import { isValidPhoneNumber } from "react-phone-number-input";
import { supabase } from "../utils/initSupabase";

const PhoneRecording = () => {
  //const supabase = useSupabaseClient();
  const user = useUser();
  const {
    subscribe,
    unSubscribeAll,
    pubnubDispatch,
    transcript,
    callRecordingData,
  } = usePubnub();

  const setTranscript = (data) => {
    pubnubDispatch({
      type: "CALL_TRANSCRIPT",
      payload: { transcript: data },
    });
  };

  const setCallRecordingData = (data) => {
    pubnubDispatch({
      type: "SET_CALL_RECORDING_SAVED",
      payload: data,
    });
  };

  const router = useRouter();

  const [filename, setFilename] = React.useState("");
  const [liveTranscript, setLiveTranscript] = React.useState("");

  const [isTranscribing, setIsTranscribing] = React.useState(false);
  //const [isDialed, setIsDialed] = React.useState(false);
  const [callStatus, setCallStatus] = React.useState();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [phoneNumber, setPhoneNumber] = React.useState(null);
  const [time, setTime] = React.useState(0);
  // state to check stopwatch running or not
  const intervalIdRef = React.useRef(null);
  const getEventResponseRef = React.useRef(null);

  const [numCalls, setNumCalls] = React.useState(0);
  const eventProcessedRef = React.useRef(false); // Ref to track if event is processed

  const dispatch = useDispatch();
  const recordingList = useSelector(
    (state) => state.recordingReducer.recordingList
  );
  //const recording = useSelector((state) => state.recordingReducer.recording);
  const isRecording = useSelector(
    (state) => state.recordingReducer.isRecording
  );

  const callControlID = useSelector(
    (state) => state.recordingReducer.callControlID
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
    [router]
  );

  useEffect(() => {
    //console.log("Current user is: ", currentUser);
    checkAuth(user);
    //getSubscriptionsInfo();
  }, [checkAuth, user]);

  const getEventType = useCallback(
    async (callId) => {
      if (!callId) return;
      try {
        //let getEventResponse;
        console.log(callId);
        if (callId) {
          getEventResponseRef.current = await supabase
            .from("call_recordings")
            .select("react_native_event")
            .eq("telnyx_call_control_id", callId);
        }

        if (!getEventResponseRef.current) {
          setCallStatus(null);
          setTimeout(() => getEventType(callId), 1000);
          console.log(
            "nothing in getEventResponse1",
            getEventResponseRef.current
          );
        } else {
          if (!getEventResponseRef.current.data[0]) {
            setCallStatus(null);
            console.log(
              "nothing in getEventResponse2",
              getEventResponseRef.current
            );
            setTimeout(() => getEventType(callId), 1000);
          } else {
            console.log(
              "getEventResponse is: ",
              getEventResponseRef.current.data[0]
            );
            setCallStatus(
              getEventResponseRef.current.data[0].react_native_event
            );
            if (
              getEventResponseRef.current.data[0].react_native_event ==
                "call.recording.saved" &&
              !eventProcessedRef.current
            ) {
              eventProcessedRef.current = true; // Mark the event as processed
              let numCallsResponse = await axios.post(
                `/api/calls-token?user=${customer.id}`
              );
              getEventResponseRef.current = null;
              console.log("numCallsResponse: ", numCallsResponse.data);
              console.log("customer: ", customer);
              let customerInfo = await supabase
                .from("customers")
                .select("*")
                .eq("email_address", customer.email_address);
              console.log("customerInfo is: ", customerInfo.data[0]);
              console.log(
                "Numer of tokens after decrement is: ",
                customerInfo.data[0].num_calls
              );
              setNumCalls(customerInfo.data[0].num_calls);
            }
            return;
          }
        }
        console.log(
          "getEventResponse: ",
          getEventResponseRef.current.data[0].react_native_event
        );
      } catch (error) {
        console.error("Error in getEventType:", error);
      }
    },
    [customer]
  );

  const getNumCalls = useCallback(
    async (user) => {
      let tokenResponse = await supabase
        .from("customers")
        .select("*")
        .eq("email_address", user?.email);
      // when signed out, TypeError: Cannot read properties of null (reading 'email')
      setNumCalls(tokenResponse?.data[0]?.num_calls);
    },
    [setNumCalls]
  );

  useEffect(() => {
    getNumCalls(user);
  }, [getNumCalls, user]);

  // Hours calculation
  const hours = Math.floor(time / 3600);

  // Minutes calculation
  const minutes = Math.floor((time % 3600) / 60);

  // Seconds calculation
  const seconds = time % 60;

  // Method to start and stop timer (not needed in this case)
  const startAndStop = () => {
    setIsRunning(!isRunning);
  };

  // Method to reset timer back to 0
  const reset = () => {
    setTime(0);
  };

  const startRecordingAudio = async () => {
    console.log("phoneNumber is: ", phoneNumber);
    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      alert("Invalid phone number!!");
      return;
    }
    // call the "dial" API endpoint
    const to = phoneNumber; //"+16472181328";
    const from = "+18885390817";
    const res_dial = await axios.get(
      `/api/dial?from=${encodeURIComponent(from)}&to=${encodeURIComponent(
        to
      )}&customer_id=${customer.id}`
    );
    console.log("call_control_id is: ", res_dial.data);
    //console.log("callStatus is: ", res_dial.status);
    dispatch(setCallControlID(res_dial.data));
    getEventType(res_dial.data);
    subscribe(res_dial.data);
    //setIsDialed(true);
    //setCallStatus(res_dial.status);
    setIsTranscribing(true);
    setTranscript("");
  };

  //Trigger call (or telnyx action) -> send event data to webhook -> webhook is ngrok -> tunnel data to port -> next app is listening on port

  const stopRecordingAudio = useCallback(async () => {
    getEventType(callControlID); // this is so that it gets the status once user hangs up
    setIsTranscribing(false);
    //setTranscript("");
    unSubscribeAll();
  }, [unSubscribeAll, callControlID, getEventType]);

  useEffect(() => {
    if (callRecordingData !== undefined) {
      stopRecordingAudio();
      if (callRecordingData === null) {
        alert("Unable to save call recording :(");
      }
    }
  }, [callRecordingData, stopRecordingAudio]);

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
      filepath: callRecordingResponse.data[0].original_file_name,
      filename,
      recordingdate: recordingdate,
      duration: duration,
      //duration: durationSeconds,
      transcript: transcript,
    });
    reset();
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
    eventProcessedRef.current = false;
    // We can go to library tab
    router.push("/dashboard");
  }

  function renderView() {
    if (isSubscribed) {
      //if (status === "recording") { // to be replaced with data.event_type from pages/api/telnyx_events.js upon publish
      // while recording or not recording yet

      if (callRecordingData && callStatus == "call.recording.saved") {
        // try the app again...
        return (
          <div className="title">
            <h2>Number of calls available: {numCalls}</h2>
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
            {/*<button onClick={stopRecordingAudio}>Stop Recording</button>*/}
            <div className="stopwatch-container">
              <h2>Number of calls available: {numCalls}</h2>
            </div>
            <h1>Transcript below</h1>
            <p>{transcript}</p>
          </div>
        );
      } else {
        if (numCalls == 0) {
          return (
            <div className="title">
              <h2>You have no calls available!</h2>
            </div>
          );
        } else {
          return (
            <div className="title">
              <h2>Number of calls available: {numCalls}</h2>
              <PhoneInput
                placeholder="Enter phone number with country code"
                //defaultCountry="US"
                value={phoneNumber}
                onChange={setPhoneNumber}
              />
              <button onClick={startRecordingAudio}>Start Recording</button>
            </div>
          );
        }
      }
    } else {
      return (
        <>
          <h1> You are not subscribed!!</h1>
        </>
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
      {/*<button
        onClick={() => {
          unSubscribeAll();
        }}
      >
        unsubscribe all
      </button>*/}
      {renderView()}
      <style jsx>{signInStyles}</style>
    </div>
  );
};

export default PhoneRecording;
