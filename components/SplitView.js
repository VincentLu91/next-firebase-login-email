import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function SplitView({ transcriptPane, chatPane }) {
  const router = useRouter();
  const view =
    router.query.view ||
    (typeof window !== "undefined" && window.innerWidth >= 1024
      ? "split"
      : "transcript");

  const [leftPct, setLeftPct] = useState(58);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    function onMove(e) {
      if (!drag) return;
      const w = window.innerWidth;
      const x = Math.max(280, Math.min(w - 360, e.clientX));
      setLeftPct(Math.round((x / w) * 100));
    }
    function onUp() {
      setDrag(false);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag]);

  const Tab = ({ id, children }) => (
    <a
      href={`${router.pathname}?view=${id}`}
      className="u-pill"
      style={{
        padding: "6px 10px",
        color: view === id ? "var(--text)" : "var(--muted)",
        background: view === id ? "var(--panel-2)" : "var(--panel)",
      }}
    >
      {children}
    </a>
  );

  if (view !== "split") {
    return (
      <div style={{ padding: "16px 24px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <Tab id="transcript">Transcript</Tab>
          <Tab id="chat">Chat</Tab>
          <span style={{ marginLeft: "auto" }} />
          <Tab id="split">Split</Tab>
        </div>
        <div className="u-card" style={{ padding: 16 }}>
          {view === "transcript" ? transcriptPane : chatPane}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 24px" }}>
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: `${leftPct}% 12px ${100 - leftPct}%`,
        }}
      >
        <div className="u-card" style={{ padding: 16 }}>
          {transcriptPane}
        </div>
        <div
          onMouseDown={() => setDrag(true)}
          style={{
            background: "var(--panel-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            cursor: "col-resize",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              margin: "auto",
              width: 2,
              height: 28,
              background: "var(--border)",
              borderRadius: 2,
            }}
          />
        </div>
        <div className="u-card" style={{ padding: 16 }}>
          {chatPane}
        </div>
      </div>
    </div>
  );
}
