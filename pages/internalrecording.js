import dynamic from "next/dynamic";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { useProtectedPage } from "../utils/auth-helpers";

const ComponentWithNoSSR = dynamic(() => import("../components/Recording"), {
  ssr: false,
});

const InternalRecording = () => {
  const router = useRouter();
  const { user, customer, loading, supabase } = useProtectedPage();

  useEffect(() => {
    // Auth is handled by useProtectedPage hook
  }, []);

  return (
    <div>
      <ComponentWithNoSSR />
    </div>
  );
};

export default InternalRecording;
