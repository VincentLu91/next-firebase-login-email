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
          grid-template-columns: 64px 1fr 120px; /* left | center | right */
          align-items: center;
          gap: 12px;
        }
        .times {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 10px;
          align-items: center;
        }
        .time {
          font-variant-numeric: tabular-nums;
          font-size: 12px;
          color: #334155;
          text-align: center;
          min-width: 48px;
        }

        .playBtn {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 8px;
          padding: 8px;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: background 150ms ease, transform 150ms ease;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          margin-left: auto;
          margin-right: auto;
        }
        .playBtn:hover {
          background: #eef2f7;
          transform: translateY(-1px);
        }
        .playBtn.on {
          background: #e0e7ff;
          border-color: #c7d2fe;
        }

        .pill {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 12px;
          line-height: 1.1;
          cursor: pointer;
          transition: background 120ms ease, transform 120ms ease;
          width: auto !important;
        }
        .pill:hover {
          background: #eef2f7;
          transform: translateY(-1px);
        }

        .rightTools {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
}
