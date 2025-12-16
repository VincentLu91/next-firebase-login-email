import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { useProtectedPage } from "../utils/auth-helpers";

// Use Next.js dynamic import with ssr: false for client-only components
const Recording = dynamic(() => import("../components/Recording"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
        background: "#0b0d12",
        color: "#e6e8ef",
      }}
    >
      Loading recording interface...
    </div>
  ),
});

const InternalRecording = () => {
  const router = useRouter();
  const { user, customer, loading, supabase } = useProtectedPage();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Auth is handled by useProtectedPage hook
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "70vh",
          background: "#0b0d12",
          color: "#e6e8ef",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div>
      <Recording />
    </div>
  );
};

export default InternalRecording;
