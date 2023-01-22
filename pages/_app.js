import "../styles/globals.css";
import { PersistGate } from "redux-persist/integration/react";
import { Provider } from "react-redux";
import store, { persistor } from "../redux/";
import Layout from "../layout/Layout";
import PubnubProvider from "../contexts/pubnub";

function MyApp({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <PubnubProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </PubnubProvider>
      </PersistGate>
    </Provider>
  );
}

export default MyApp;
