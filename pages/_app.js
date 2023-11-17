import "../styles/globals.css";
import { PersistGate } from "redux-persist/integration/react";
import { Provider } from "react-redux";
import store, { persistor } from "../redux/";
import Layout from "../layout/Layout";
import PubnubProvider from "../contexts/pubnub";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { useState } from "react";

function MyApp({ Component, pageProps }) {
  const [supabase] = useState(() => createPagesBrowserClient());
  return (
    <SessionContextProvider
      supabaseClient={supabase}
      initialSession={pageProps.initialSession}
    >
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <PubnubProvider>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </PubnubProvider>
        </PersistGate>
      </Provider>
    </SessionContextProvider>
  );
}

export default MyApp;
