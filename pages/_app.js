import "../styles/globals.css";
import { PersistGate } from "redux-persist/integration/react";
import { Provider } from "react-redux";
import store, { persistor } from "../redux/";
import Layout from "../layout/Layout";
import SimpleLayout from "../layout/SimpleLayout";
import { useRouter } from "next/router";
import PubnubProvider from "../contexts/pubnub";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { useState } from "react";
import { Manrope } from "next/font/google";
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

function MyApp({ Component, pageProps }) {
  const [supabase] = useState(() => createPagesBrowserClient());
  const router = useRouter();

  // Use SimpleLayout for public pages
  const useSimpleLayout =
    [
      "/",
      "/pricing",
      "/signin",
      "/signup",
      "/about",
      "/blog",
      "/privacypolicy",
      "/termsofuse",
      "/request-reset",
    ].includes(router.pathname) || router.pathname.startsWith("/post/");
  return (
    <div className={`app-shell ${manrope.className}`}>
      <SessionContextProvider
        supabaseClient={supabase}
        initialSession={pageProps.initialSession}
      >
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <PubnubProvider>
              {useSimpleLayout ? (
                <SimpleLayout>
                  <Component {...pageProps} />
                </SimpleLayout>
              ) : (
                <Layout>
                  <Component {...pageProps} />
                </Layout>
              )}
            </PubnubProvider>
          </PersistGate>
        </Provider>
      </SessionContextProvider>
    </div>
  );
}

export default MyApp;
