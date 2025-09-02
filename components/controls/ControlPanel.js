import React, { useEffect, useMemo, useState } from "react";

export default function ControlPanel({
  play,
  isPlaying,
  duration = 0,
  currentTime = 0,
  audioRef,
}) {
  // Force a re-render when the <audio> element reveals metadata/time
  const [__tick, __setTick] = useState(0);

  useEffect(() => {
    const el = audioRef?.current;
    if (!el) return;

    const nudge = () => __setTick((x) => x + 1);

    el.addEventListener("loadedmetadata", nudge);
    el.addEventListener("durationchange", nudge);
    el.addEventListener("timeupdate", nudge);
    el.addEventListener("progress", nudge);

    // If metadata is already present
    if (el.readyState >= 1) nudge();

    return () => {
      el.removeEventListener("loadedmetadata", nudge);
      el.removeEventListener("durationchange", nudge);
      el.removeEventListener("timeupdate", nudge);
      el.removeEventListener("progress", nudge);
    };
  }, [audioRef?.current]);

  // Prefer the element's duration/time; fall back to props
  const effectiveDuration = useMemo(() => {
    const el = audioRef?.current;
    const d = el?.duration;
    if (Number.isFinite(d) && d > 0) return d;

    // Some WAVs expose seekable before duration
    const sr = el?.seekable;
    if (sr && sr.length > 0) {
      const end = sr.end(sr.length - 1);
      if (Number.isFinite(end) && end > 0) return end;
    }
    return Number.isFinite(duration) && duration > 0 ? duration : 0;
  }, [audioRef?.current, duration, __tick]);

  const effectiveTime = useMemo(() => {
    const el = audioRef?.current;
    const t = el?.currentTime;
    if (Number.isFinite(t) && t >= 0) return t;
    return Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0;
  }, [audioRef?.current, currentTime, __tick]);

  // Clamp helper for skip buttons (keeps your UI intact)
  const clampSeek = (deltaSeconds) => {
    const el = audioRef?.current;
    if (!el) return;
    const d = effectiveDuration;
    if (!Number.isFinite(d) || d <= 0) return; // don't seek until we know duration
    const now = Number.isFinite(el.currentTime) ? el.currentTime : 0;
    el.currentTime = Math.max(0, Math.min(d, now + deltaSeconds));
  };

  const t = (s) => {
    if (!Number.isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60),
      sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="cp">
      <div>
        <button className="pill" onClick={() => clampSeek(-10)}>
          ⟲ 10s
        </button>
      </div>

      <div className="times">
        <span className="time">{t(effectiveTime)}</span>
        <button
          className={`playBtn ${isPlaying ? "on" : ""}`}
          onClick={play}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "❚❚" : "►"}
        </button>
        <span className="time">{t(effectiveDuration)}</span>
      </div>

      <div className="rightTools">
        <button className="pill" onClick={() => clampSeek(10)}>
          10s ⟳
        </button>
      </div>

      <style jsx>{`
        .cp {
          display: grid;
          grid-template-columns: 80px 1fr 80px;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-4);
        }

        .times {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: var(--space-3);
          align-items: center;
        }

        .time {
          font-variant-numeric: tabular-nums;
          font-size: 12px;
          color: black;
          text-align: center;
          min-width: 48px;
          font-family: var(--font-family);
          font-weight: 600;
          letter-spacing: -0.1px;
        }

        .playBtn {
          border: 1px solid var(--muted-600);
          background: var(--bg-700);
          border-radius: var(--radius-input);
          padding: var(--space-2);
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: var(--transition-base);
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          margin-left: auto;
          margin-right: auto;
          color: var(--text-100);
        }

        .playBtn:hover {
          transform: scale(0.98);
          opacity: 0.92;
        }

        .playBtn.on {
          background: var(--accent-400);
          border-color: var(--accent-400);
          color: #101114;
        }

        .pill {
          border: 1px solid var(--muted-600);
          background: var(--bg-700);
          border-radius: var(--radius-pill);
          padding: var(--space-2) var(--space-3);
          font-size: 12px;
          line-height: 1.1;
          cursor: pointer;
          transition: var(--transition-base);
          width: auto !important;
          color: var(--text-300);
          font-family: var(--font-family);
          font-weight: 600;
          letter-spacing: -0.1px;
        }

        .pill:hover {
          color: var(--text-100);
        }

        .rightTools {
          display: flex;
          gap: var(--space-2);
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
}
