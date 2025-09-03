import dynamic from "next/dynamic";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";

const ComponentWithNoSSR = dynamic(() => import("../components/Recording"), {
  ssr: false,
});

const InternalRecording = () => {
  const router = useRouter();
  const user = useUser();
  const supabase = useSupabaseClient();
  const checkAuth = useCallback(
    async (user) => {
      if (!user) {
        console.log(
          "The user is inauthenticated, redirecting back to signin page"
        );
        router.push("/signin");
      }
    },
    [router]
  );

  useEffect(() => {
    checkAuth(user);
  }, [checkAuth, user]);

  return (
    <div>
      <ComponentWithNoSSR />
    </div>
  );
};

export default InternalRecording;
