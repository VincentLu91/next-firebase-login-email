import {
  configureStore,
  combineReducers,
  applyMiddleware,
} from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist"; // imports from redux-persist
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web
import recordingAudioReducer, {
  initialState as initialRARState,
} from "./recording/recordingAudioReducer";
import userReducer, {
  initialState as initialURState,
} from "./user/userReducer";
import languageReducer, {
  initialState as initialLRState,
} from "./language/languageReducer";
import logger from "redux-logger";

// uses redux.js/toolkit instead of redux as required by NextJS 13 onward:
// https://hackernoon.com/how-to-manage-state-in-nextjs-13-using-redux-toolkit

const allReducers = combineReducers({
  recordingReducer: recordingAudioReducer,
  user: userReducer,
  languageReducer: languageReducer,
});

const persistConfig = {
  // configuration object for redux-persist
  key: "root",
  storage, // define which storage to use
};

const rootReducer = (state, action) => {
  console.log("test", action, state);
  if (action.type === "SIGNED_OUT") {
    console.log("Clearing store");
    state = {
      recordingReducer: initialRARState,
      user: initialURState,
      languageReducer: initialLRState,
    };
  }

  return allReducers(state, action);
};

const persistedReducer = persistReducer(persistConfig, rootReducer); // create a persisted reducer

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(logger),
});
const persistor = persistStore(store); // used to create the persisted store, persistor will be used in the next step
export default store;
export { persistor };
//export default configureStore(allReducers);
