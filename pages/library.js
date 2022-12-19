import * as React from "react";
import { useEffect, useCallback, useRef, useState } from "react";
import db, { storage, auth } from "../firebase";
import { useDispatch, useSelector } from "react-redux";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  orderBy,
} from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { setCurrentUser } from "../redux/user/actions";
import { setSound } from "../redux/recording/actions";
import { useRouter } from "next/router";
//import { printTranscription } from "../../../redux/language/actions";
import { onAuthStateChanged } from "firebase/auth";
import libraryStyles from "../styles/libraryStyles";

const Library = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.user.currentUser);
  const [subscription, setSubscription] = useState(null);
  const [cloudRecordingList, setCloudRecordingList] = React.useState([]);
  const [search, setNewSearch] = React.useState("");

  async function getSubscriptionsInfo(user) {
    //if (!userContext.user) return;
    const subscriptionsRef = collection(
      db,
      //`customers/${userContext.user.uid}/subscriptions`
      `customers/${user.uid}/subscriptions` // why does this not work? update: it works, I had to call this fn in checkAuth()
      //`customers/CvKhT7Q8Ubeo4ImF3qToeJZBEJ22/subscriptions` // why does this work? because it identifies the ID upon useEffect
    );
    const q = query(subscriptionsRef, orderBy("created"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((subscription) => {
      console.log("subscription: ", subscription.id, subscription.data());
      setSubscription({
        role: subscription.data().role,
        subscriptionId: subscription.id,
        current_period_start: subscription.data().current_period_start,
        current_period_end: subscription.data().current_period_end,
      });
    });
  }

  const checkAuth = useCallback(
    async (user) => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          // User is signed in, see docs for a list of available properties
          // https://firebase.google.com/docs/reference/js/firebase.User
          const uid = user.uid;
          console.log("The user is authenticated with the uid: ", uid);
          getSubscriptionsInfo(user);
          // ...
        } else {
          // User is signed out
          // ...
          console.log(
            "The user is inauthenticated, redirecting back to signin page"
          );
          router.push("/");
        }
      });
    },
    [router]
  );

  const downloadAudio = async (fileName) => {
    const uri = getDownloadURL(ref(storage, fileName));
    return uri;
  };

  const loadRecordings = useCallback(async (authUser) => {
    const recordingRef = collection(db, `recordings/${authUser.uid}/files`);
    const recordingRefQuery = query(
      recordingRef,
      where("user", "==", authUser.uid)
    );
    const querySnapshot = await getDocs(recordingRefQuery);
    if (querySnapshot) {
      const data = [];
      const audioDownloads = [];
      querySnapshot.forEach(async (documentSnapshot) => {
        if (documentSnapshot.exists()) {
          const originalFilename = documentSnapshot.data().originalFilename;
          data.push(documentSnapshot.data());
          audioDownloads.push(downloadAudio(originalFilename));
        }
      });

      Promise.all(audioDownloads).then((res) => {
        setCloudRecordingList(
          data.map((el, i) => {
            return { ...el, filepath: res[i] };
          })
        );
      });
    }
  }, []);

  // this is to check for the userID upon page refresh in the event it gets wiped out.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      console.log("authUser is: ", authUser); // uid
      if (authUser) {
        dispatch(setCurrentUser(authUser));
        loadRecordings(authUser);
      }
    });

    return unsubscribe;
  }, [dispatch, loadRecordings]);

  React.useEffect(() => {
    console.log("Cloud Recording List is: ", cloudRecordingList);
  }, [cloudRecordingList]);

  // create useEffect to track user's subscriptions...
  useEffect(() => {
    //console.log("Current user is: ", currentUser);
    checkAuth(currentUser);
    //getSubscriptionsInfo();
  }, [checkAuth, currentUser]);
  console.log(currentUser);
  if (!subscription) return null;

  // function to delete a recording:
  async function deleteRecording(filename, authUser) {
    console.log("deleting recording: ", filename);
    const deleteRef = collection(db, `recordings/${authUser.uid}/files`);
    let deleteQuery = query(
      deleteRef,
      where("user", "==", authUser.uid),
      where("originalFilename", "==", filename)
    );
    const querySnapshot = await getDocs(deleteQuery);
    querySnapshot.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });
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
          item.fileName.toLowerCase().includes(search.toLowerCase()) ||
          item.transcript.toLowerCase().includes(search.toLowerCase())
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
          console.log("item", item);
          return (
            <li key={item.originalFilename}>
              <div>{item.fileName}</div>
              <button onClick={() => viewContent(item)}>
                View Recording And Transcription
              </button>
              <button
                onClick={() =>
                  deleteRecording(item.originalFilename, currentUser)
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
