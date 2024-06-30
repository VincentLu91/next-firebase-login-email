import * as React from "react";
import { useEffect, useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { setSound } from "../redux/recording/actions";
import { useRouter } from "next/router";
//import { printTranscription } from "../../../redux/language/actions";
import libraryStyles from "../styles/libraryStyles";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";

const Dashboard = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const supabase = useSupabaseClient();
  const user = useUser();
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);

  const [cloudRecordingList, setCloudRecordingList] = React.useState([]);
  const [search, setNewSearch] = React.useState("");
  const [customer, setCustomer] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
        // we don't have to check subscriptions because if the user cancels plan, they could still listen
        // to existing audio/transcripts.
        /*console.log(
          "subscriptionResponse is: ",
          subscriptionResponse.data[0].stripe_product_name
        );
        setSubscriptionInfo(subscriptionResponse.data[0].stripe_product_name);*/
        let micRecordingInfo = await supabase
          .from("mic_recordings")
          .select(
            "id, customer_id, file_name, duration, full_transcript, original_file_name, created_at"
          )
          .eq("customer_id", customerInfo.data[0].id);
        //console.log("micRecordingInfo is: ", micRecordingInfo.data);
        let callRecordingInfo = await supabase
          .from("call_recordings")
          .select(
            "id, customer_id, file_name, duration, full_transcript, original_file_name, created_at"
          )
          .eq("customer_id", customerInfo.data[0].id);
        //console.log("callRecordingInfo is: ", callRecordingInfo.data);
        let combinedRecordingInfo = micRecordingInfo.data.concat(
          callRecordingInfo.data
        );
        console.log("combinedRecordingInfo is: ", combinedRecordingInfo);
        setCloudRecordingList(combinedRecordingInfo);
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
    let micDeleteInfo = await supabase
      .from("mic_recordings")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", customer.id)
      .eq("original_file_name", original_file_name);
    let callDeleteInfo = await supabase
      .from("call_recordings")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", customer.id)
      .eq("original_file_name", original_file_name);
    if (micDeleteInfo.count > 0) {
      console.log("mic delete.....");
      await supabase
        .from("mic_recordings")
        .delete()
        .eq("customer_id", customer.id)
        .eq("original_file_name", original_file_name);
    } else if (callDeleteInfo.count > 0) {
      console.log("call delete.....");
      let callChunkDeleteInfo = await supabase
        .from("call_recordings")
        .select("*")
        .eq("original_file_name", original_file_name);
      console.log(
        "callChunkDeleteInfo ID is: ",
        callChunkDeleteInfo.data[0].id
      );
      // delete from chunks table first since it depends on `call_recording` table
      await supabase
        .from("telnyx_transcript_chunks")
        .delete()
        .eq("call_recording_id", callChunkDeleteInfo.data[0].id);

      await supabase
        .from("call_recordings")
        .delete()
        .eq("customer_id", customer.id)
        .eq("original_file_name", original_file_name);
    }
    const storageDeleteResponse = await supabase.storage
      .from("recreate-ai-storage-bucket")
      .remove([original_file_name]);
    console.log("storageDeleteResponse is: ", storageDeleteResponse);
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

  // Calculate the total number of pages
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  // Calculate the items to display on the current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="title">
      <h2>List of recordings and transcriptions</h2>
      <input type="text" value={search} onChange={handleSearchChange} />
      <ul className="no-bullet">
        {currentItems.map(function (item) {
          //console.log("item", item);
          return (
            <li key={item.created_at}>
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
      <button
        onClick={() => setCurrentPage(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>
      <span>
        {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => setCurrentPage(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
      <h3>The total number of recordings is: {cloudRecordingList.length}</h3>
      <h3>The filtered number of recordings is: {filtered.length}</h3>
      <style jsx>{libraryStyles}</style>
    </div>
  );
};

export default Dashboard;
