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
    case "CALL_TRANSCRIPT": {
      state.transcriptCallback(action.payload.transcript)
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
        const type = messageEvent.message.action === 'call.transcription' ? 'CALL_TRANSCRIPT' : 'OTHER_STUFF'
        pubnubDispatch({ type, payload: messageEvent.message })
      },
      /*presence: (presenceEvent) => {
          // handle presence
        },*/
    });
    pubnubDispatch({ type: "SET_PUBNUB", payload: instance })
  }, []);

  const subscribe = useCallback(
    (channelName) => {
      // subscribe to a channel
      pubnubState.pubnub.subscribe({
        channels: [channelName],
      });
    },
    [pubnubState]
  );

  const unSubscribe = useCallback(
    (channelName) => {
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
