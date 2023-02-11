import * as React from "react";
import { useEffect, useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { setSound } from "../redux/recording/actions";
import { useRouter } from "next/router";
//import { printTranscription } from "../../../redux/language/actions";
import libraryStyles from "../styles/libraryStyles";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";

const Library = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const supabase = useSupabaseClient();
  const user = useUser();
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);

  const [cloudRecordingList, setCloudRecordingList] = React.useState([]);
  const [search, setNewSearch] = React.useState("");
  const [customer, setCustomer] = useState(null);

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
        console.log(
          "subscriptionResponse is: ",
          subscriptionResponse.data[0].stripe_product_name
        );
        setSubscriptionInfo(subscriptionResponse.data[0].stripe_product_name);
        let micRecordingInfo = await supabase
          .from("mic_recordings")
          .select("*")
          .eq("customer_id", customerInfo.data[0].id);
        setCloudRecordingList(micRecordingInfo.data);
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

  // this is to check for the user status and subscriptions before loading all recording objects
  useEffect(() => {
    checkAuth(user);
  }, [checkAuth, user]);

  useEffect(() => {
    console.log("Cloud Recording List is: ", cloudRecordingList);
  }, [cloudRecordingList]);

  // function to delete a recording:
  async function deleteRecording(original_file_name, customer) {
    console.log("deleting recording: ", original_file_name);
    const { data, error } = await supabase
      .from("mic_recordings")
      .delete()
      .eq("customer_id", customer.id)
      .eq("original_file_name", original_file_name);
    if (error) {
      console.log("Error deleting: ", error);
    }
    if (data) {
      console.log("Data deleting: ", data);
    }
    router.push("/dashboard");
  }

  // will call later
  async function viewContent(item) {
    //dispatch(printTranscription(transcription));
    //console.log("Transcription from Library is: ", transcription);
    dispatch(setSound(item));
    router.push("/audioplayer");
  }

  const handleSearchChange = (e) => {
    setNewSearch(e.target.value);
  };

  const filtered = !search
    ? cloudRecordingList
    : cloudRecordingList.filter(
        (item) =>
          item.file_name?.toLowerCase().includes(search.toLowerCase()) ||
          item.full_transcript?.toLowerCase().includes(search.toLowerCase())
      );

  return (
    <div className="title">
      <button onClick={() => router.push("/dashboard")}>
        Back to Dashboard
      </button>
      <h2>List of recordings and transcriptions</h2>
      <input type="text" value={search} onChange={handleSearchChange} />
      <ul className="no-bullet">
        {filtered.map(function (item) {
          //console.log("item", item);
          return (
            <li key={item.original_file_name}>
              <div>{item.file_name}</div>
              <button onClick={() => viewContent(item)}>
                View Recording And Transcription
              </button>
              <button
                onClick={() =>
                  deleteRecording(item.original_file_name, customer)
                }
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>
      <h3>The total number of recordings is: {cloudRecordingList.length}</h3>
      <h3>The filtered number of recordings is: {filtered.length}</h3>
      <style jsx>{libraryStyles}</style>
    </div>
  );
};

export default Library;
