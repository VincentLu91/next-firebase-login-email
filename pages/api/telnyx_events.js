import Telnyx from "telnyx";
import db from "../../firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

import { publishMessage } from "../../lib/pubnub";

// purpose of this serverless API: connect the API to a webhook so it could send data to the app.
// go to terminal, run ngrok http 3001 (3001 is the port for the app)
// you will get a Forwarding webhook URL that forwards data to the app. Copy that URL to the voice app.
// with the code below, you could find the event type!
// to publish transcript on the front-end, send via socket. See comments at bottom
// when a phone call is made, this serverless API will automatically get called,
// that's because the voice app's connection ID in /api/dial.js is referenced in the call, it will recognize the
// webhook URL, thus triggering this telnyx_events API call, giving us outputs in the logs that we print below
// from the ngrok output, if I enter the Web Interface URL i.e., http://127.0.0.1:4040 in the browser, we could
// see all the requests being made and their status codes, similar to Postman
// in production, I will need a paid, permanent ngrok webhook URL for a voice app to read events in real-time.
export default async function handler(req, res) {
  //try {
  const telnyx = Telnyx(
    "KEY017EE15F9667935CDD8D6B422B40D671_Ko22qTGdS4engYHoawMjhB"
  );
  console.log("req.body", req.body, "-------------------------------------");
  const data = req.body.data;
  console.log(data.event_type);

  if (data.event_type === "call.transcription") {
    // 1. Save call.transcription data to db   - DONE
    // 2. Fetch all call.transcription data from db, sort by date timestamp. - DONE
    // 3. Concantenate transcript (include last transcript timestamp) - DONE
    // 4. Publish to frontend - DONE

    // publish to frontend
    /*   {
        event_type: 'call.transcription',
        id: '1146758b-e03d-4a82-8aac-40882f1abe2b',
        occurred_at: '2023-01-18T18:13:45.509654Z',
        payload: {
          call_control_id: 'v3:4W5lcRySHbuVhsND6G2tWWeR-ax3YqyOdv3JCFI27pemQFeB2S39mA',
          call_leg_id: 'd0e06fde-975b-11ed-94ed-02420a0de568',
          call_session_id: 'd0dc0318-975b-11ed-b4a2-02420a0de568',
          client_state: 'Q3ZLaFQ3UThVYmVvNEltRjNxVG9lSlpCRUoyMg==',
          connection_id: '2071587752461206796',
          transcription_data: [Object]
        },
        record_type: 'event'
      },
      meta: {
        attempt: 1,
        delivered_to: 'http://b988-142-114-125-127.ngrok.io/api/telnyx_events'
      }
    }*/

    const uid = Buffer.from(data.payload.client_state, "base64").toString();
    const { occurred_at, id, payload: { call_control_id, transcription_data } } = data
    addDoc(
      collection(db, `recordings/${uid}/transcripts`),
      { occurred_at, id, call_control_id, transcription_data }
     );
    const transcriptsRef = collection(db, `recordings/${uid}/transcripts`);
    const transcriptQuery = query(transcriptsRef, where("call_control_id", "==", call_control_id))
    const transcriptData = await getDocs(transcriptQuery);
    const transcripts = [];
    transcriptData.forEach((doc) => {
      transcripts.push(doc.data());
    });
    // TODO: maybe offload to db
    transcripts.sort((x, y) => {
      return new Date(x.occurred_at) - new Date(y.occurred_at)
    });
    const transcript = transcripts.map(item => item.transcription_data.transcript).join("");
    console.log("transcript is: ", transcript);
    publishMessage(data.payload.call_control_id, {
      transcript,
      action: data.event_type,
    });
  } else if (data.event_type === "call.answered") {
    // call transcription function
    const transcription_call = telnyx.Call({
      call_control_id: data.payload.call_control_id,
    });
    try {
      await transcription_call.transcription_start({ language: "en" });
    } catch (e) {
      console.log(e);
    }
  }
  res.status(200).json({ name: "John Doe" });
  //} catch (error) {}
}

//telynx event calls /api/telnyx_events --- {transcript: 123} --- send via socket to frontend (pusher, pubnub) -- you respond with John Doe

//react app calls  /api/telnyx_events --- {} ---- you respond with John Doe

//react app  calls /api/getTranscript --- { call control id } --- call telnyx?? --- go to db and fetch data
