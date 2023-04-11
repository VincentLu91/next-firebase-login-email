import Telnyx from "telnyx";
import { supabase } from "../../utils/initSupabase";

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

    const customer_id = Buffer.from(
      data.payload.client_state,
      "base64"
    ).toString();
    const {
      occurred_at,
      id,
      payload: { call_control_id, transcription_data },
    } = data;

    const callRecordingResponse = await supabase
      .from("call_recordings")
      .upsert(
        { telnyx_call_control_id: call_control_id, customer_id },
        { onConflict: "telnyx_call_control_id", ignoreDuplicates: false }
      )
      .select();

    if (callRecordingResponse.data) {
      let telnyxChunkResponse = await supabase
        .from("telnyx_transcript_chunks")
        .insert({
          occurred_at,
          call_recording_id: callRecordingResponse.data[0].id,
          transcription_data,
        });

      if (!telnyxChunkResponse.error) {
        telnyxChunkResponse = await supabase
          .from("telnyx_transcript_chunks")
          .select()
          .eq("call_recording_id", callRecordingResponse.data[0].id)
          .order("occurred_at", { ascending: true });

        const transcript = telnyxChunkResponse.data
          .map((item) => item.transcription_data.transcript)
          .join("");
        publishMessage(data.payload.call_control_id, {
          transcript,
          action: data.event_type,
        });
      }
    }
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
  } else if (data.event_type === "call.recording.saved") {
    let callRecordingMp3Url;
    let callRecordingMp3FileName;
    let callRecordingMp3Duration;
    // store the recording_id so I could get the mp3 url

    console.log("data download urls is: ", data.payload.recording_id);
    const recording_id = data.payload.recording_id;
    // download file from telnyx using recoird id
    // upload file to supabase
    // send url and call_recording_id to frontend

    // next, store the recording_id in the table. Use upsert or update
    const callRecordingResponse = await supabase
      .from("call_recordings")
      .update({ recording_id: data.payload.recording_id })
      .eq("telnyx_call_control_id", data.payload.call_control_id)
      .select();
    if (callRecordingResponse.error) {
      console.log(
        "cannot capture recording_id due to error: ",
        callRecordingResponse.error
      );
    }
    if (callRecordingResponse.data) {
      console.log("saved recording data is: ", callRecordingResponse.data[0]);
      // download file from telnyx using recoird id, data.payload.recording_id
      var myHeaders = new Headers();
      myHeaders.append("x-api-user", "vincentlu299@gmail.com");
      myHeaders.append("x-api-token", "5HrYQZpYSu-__anTZNVmhw");
      myHeaders.append("Accept", "application/json");
      myHeaders.append("Content-Type", "application/json");

      var requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
      };
      try {
        const response = await fetch(
          `https://api.telnyx.com/recordings/${recording_id}`,
          requestOptions
        ); // so we could get the value out of the promise for reference in later steps below
        const result = await response.json(); // instead of text() which was found in the Postman snippet
        callRecordingMp3Url = result.data.download_urls.mp3;
        //console.log("callRecordingMp3Url is: ", callRecordingMp3Url); // instead of request, this saves the value
        callRecordingMp3FileName = result.data.call.id + ".mp3"; // basically recording_id.mp3
        console.log("callRecordingMp3FileName is: ", callRecordingMp3FileName);
        console.log("result.data is: ", result.data);
        callRecordingMp3Duration = result.data.duration;
      } catch (error) {
        console.log("Call recording fetch error: ", error);
      }
      console.log("callRecordingMp3Url is: ", callRecordingMp3Url);
      const downloadRecordingResponse = await fetch(callRecordingMp3Url);
      const blob = await downloadRecordingResponse.blob();
      const arrayBuffer = await blob.arrayBuffer();
      // upload file to supabase
      const blobResponse = await supabase.storage
        .from("recreate-ai-storage-bucket")
        .upload(callRecordingMp3FileName, arrayBuffer, {
          // works with blob as well but it's not supported in React Native
          contentType: "audio/mp3",
        });
      if (blobResponse.error) {
        console.log("call recording blobResponse Error: ", blobResponse.error);
      }
      if (blobResponse.data) {
        console.log("call recording blobResponse data: ", blobResponse.data);
        let uploadRecordingResponse = await supabase
          .from("call_recordings")
          .update({
            original_file_name: callRecordingMp3FileName,
            durationMillis: callRecordingMp3Duration,
          })
          .select()
          .eq("recording_id", recording_id);
        if (uploadRecordingResponse.error) {
          console.log("Cannot update mp3 name, see error: ");
          console.log(uploadRecordingResponse.error);
        }
        if (uploadRecordingResponse.data) {
          console.log("uploadRecordingResponse Success!");
          console.log(uploadRecordingResponse.data);
          // refresh the page so the websocket doesn't remain open
        }
      }
    }
    const publishPayload = {
      //url: callRecordingMp3Url,
      call_recording_id: callRecordingResponse.data
        ? callRecordingResponse.data[0].id
        : null,
      action: data.event_type,
    };
    console.log('about to publish',data.payload.call_control_id, publishPayload)
    await publishMessage(data.payload.call_control_id, publishPayload);
    // seems to work in uploading. just need to render the UI to display call recordings now...
    // but I can't find storage items. Edit: I CAN find it, but it takes a bit of browsing. No search bars...
  }
  res.status(200).json({ name: "John Doe" });
  //} catch (error) {}
}

//telynx event calls /api/telnyx_events --- {transcript: 123} --- send via socket to frontend (pusher, pubnub) -- you respond with John Doe

//react app calls  /api/telnyx_events --- {} ---- you respond with John Doe

//react app  calls /api/getTranscript --- { call control id } --- call telnyx?? --- go to db and fetch data
