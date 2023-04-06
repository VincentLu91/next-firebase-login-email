import PubNub from "pubnub";
import { useContext, createContext, useCallback, useState, useReducer, useEffect } from "react";

const PubnubContext = createContext();

const EMPTY_OBJECT = {}

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_PUBNUB": {
      return { ...state, pubnub: action.payload };
    }
    case "SET_TRANSCRIPT_CALLBACK": {
      return { ...state, transcriptCallback: action.payload };
    }
    case "SET_CALL_RECORDING_SAVED_CALLBACK": {
      return { ...state, callRecordingSavedCallback: action.payload };
    }
    case "SET_CALL_RECORDING_SAVED": {
      state.callRecordingSavedCallback({ call_recording_id: action.payload.call_recording_id, url: action.payload.url })
      return state
    }
    case "CALL_TRANSCRIPT": {
      state.transcriptCallback(action.payload.transcript);
      return state;
    }
    default:
      return state;
  }
}

const usePubnub = () => {
  const context = useContext(PubnubContext);
  if (!context)
    throw new Error("usePubnubContext must be used within PubnubProvider!");
  return context;
};

const PubnubProvider = ({ children }) => {
  const [pubnubState, pubnubDispatch] = useReducer(reducer, EMPTY_OBJECT)

  useEffect(() => {
    const instance = new PubNub({
      publishKey: "pub-c-6b9eeb0b-bbaa-44ee-bab2-859a8f35724a",
      subscribeKey: "sub-c-99fbc867-98f7-469e-a595-6dab6e00a5ea",
      userId: "recreate-ai-user",
    });
    instance.addListener({
      /*status: (statusEvent) => {
          if (statusEvent.category === "PNConnectedCategory") {
            console.log("Connected");
          }
        },*/
      message: (messageEvent) => {
        console.log('messageEvent', messageEvent);
        switch (messageEvent.message.action) {
          case 'call.transcription':
            pubnubDispatch({
              type: 'CALL_TRANSCRIPT',
              payload: messageEvent.message,
            });
            break;
          case 'call.recording.saved':            
            pubnubDispatch({ type: 'SET_CALL_RECORDING_SAVED', payload: messageEvent.message });
            break;
          default:
          // code block
        }        
      },
      /*presence: (presenceEvent) => {
          // handle presence
        },*/
    });
    pubnubDispatch({ type: "SET_PUBNUB", payload: instance })
  }, []);

  const subscribe = useCallback(
    (channelName) => {
      console.log('subscribe to ', channelName)
      // subscribe to a channel
      pubnubState.pubnub.subscribe({
        channels: [channelName],
      });
    },
    [pubnubState]
  );

  const unSubscribe = useCallback(
    (channelName) => {
      console.log('unsubscribe')
      // unsubscribe to a channel
      pubnubState.pubnub.unsubscribe({
        channels: [channelName],
      });
    },
    [pubnubState]
  );

   const unSubscribeAll = useCallback(
     () => {
       // unsubscribe all channels
       console.log('unsubscribe all')
       pubnubState.pubnub.unsubscribeAll()
     },
     [pubnubState]
   );

  return (
    <PubnubContext.Provider value={{ subscribe, unSubscribe, unSubscribeAll, pubnubDispatch }}>
      {children}
    </PubnubContext.Provider>
  );
};

export default PubnubProvider;
export { usePubnub };
