import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { useProtectedPage } from "../utils/auth-helpers";

// Use React.lazy instead of next/dynamic for better Turbopack compatibility
const Recording = React.lazy(() => import("../components/Recording"));

const InternalRecording = () => {
  const router = useRouter();
  const { user, customer, loading, supabase } = useProtectedPage();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Auth is handled by useProtectedPage hook
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Suspense fallback={<div>Loading recording interface...</div>}>
        <Recording />
      </Suspense>
    </div>
  );
};

export default InternalRecording;
