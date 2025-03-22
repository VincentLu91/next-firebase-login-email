import * as React from "react";
import { useEffect, useCallback, useState } from "react";
import axios from "axios";
import PhoneInput from "react-phone-number-input";
import { isValidPhoneNumber } from "react-phone-number-input";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { supabase } from "../utils/initSupabase";

const ASSEMBLY_AI_KEY =
  process.env.ASSEMBLY_AI_KEY || "8acedd22ef7542259df0f36dc8bf18ac";

const PhoneRecording2 = () => {
  const [transcriptionText, setTranscriptionText] = useState("");
  const [phoneNumber, setPhoneNumber] = React.useState(null);
  const [customer, setCustomer] = useState(null);
  const user = useUser();
  const router = useRouter();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  // const fetchTranscription = async () => {
  //   const url = "/api/getTranscription";
  //   const res = await fetch(url);
  //   const data = await res.json();
  //   console.log("data", data);
  //   setTranscriptionText(data?.transcription);
  // };

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

  useEffect(() => {
    const wsUrl = `wss://call-transcribe-heroku-b15b1132d70f.herokuapp.com`;
    let ws = new WebSocket(wsUrl);
    let keepAliveInterval;

    ws.onopen = () => {
      console.log("WebSocket connected");
      keepAlive();
    };

    ws.onclose = () => {
      console.log("WebSocket closed. Reconnecting...");
      reconnect();
    };

    function keepAlive() {
      if (ws.readyState === WebSocket.OPEN) {
        console.log("Sending ping to server");
        ws.send(JSON.stringify({ event: "ping" }));
      }
      keepAliveInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: "ping" }));
        }
      }, 20 * 1000); // Send every 20 seconds
    }

    function reconnect() {
      setTimeout(() => {
        ws = new WebSocket(wsUrl);
      }, 5000);
    }

    ws.onmessage = function (msg) {
      console.log("on new message...", msg.data);
      const data = JSON.parse(msg.data);
      if (data.event === "interim-transcription") {
        setTranscriptionText(data.text);
      }
    };

    // Cleanup function to close WebSocket and clear intervals when component unmounts
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
      }
    };
  }, []); // Empty dependency array means this runs once when component mounts

  const dialNumber = async () => {
    try {
      console.log("phoneNumber is: ", phoneNumber);
      if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
        alert("Invalid phone number!");
        return;
      }

      if (!customer || !customer.id) {
        alert("Please wait for customer data to load");
        return;
      }

      // call the "dial" API endpoint
      const to = phoneNumber;
      const res_dial = await axios.get(
        `/api/dialTwilio?to=${encodeURIComponent(to)}&customer_id=${
          customer.id
        }`
      );
      console.log("res_dial.data is: ", res_dial.data);
    } catch (error) {
      console.error(
        "Error making call:",
        error.response?.data || error.message
      );
      alert(
        "Failed to make call: " + (error.response?.data?.error || error.message)
      );
    }
  };

  return (
    <div>
      <div>
        <button onClick={dialNumber}>Dial Number</button>
        <PhoneInput
          placeholder="Enter phone number with country code"
          //defaultCountry="US"
          value={phoneNumber}
          onChange={setPhoneNumber}
        />
        <p>Your text is:</p>
        <p>{transcriptionText}</p>
      </div>
    </div>
  );
};

export default PhoneRecording2;
