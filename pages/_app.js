import "../styles/globals.css";
import { PersistGate } from "redux-persist/integration/react";
import { Provider } from "react-redux";
import store, { persistor } from "../redux/";
import Layout from "../layout/Layout";
import PubnubProvider from "../contexts/pubnub";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { useState } from "react";

function MyApp({ Component, pageProps }) {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SessionContextProvider
          supabaseClient={supabase}
          initialSession={pageProps.initialSession}
        >
          <PubnubProvider>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </PubnubProvider>
        </SessionContextProvider>
      </PersistGate>
    </Provider>
  );
}

export default MyApp;
