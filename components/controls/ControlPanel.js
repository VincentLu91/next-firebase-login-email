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
          {isPlaying ? (
            <span className="pauseIcon" aria-hidden="true">
              <span />
              <span />
            </span>
          ) : (
            <span className="playIcon" aria-hidden="true" />
          )}
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
          width: 100%;
          display: grid;
          grid-template-columns: 72px 1fr 72px;
          align-items: center;
          gap: 18px;
          padding: 18px 0 4px;
        }

        .times {
          display: grid;
          grid-template-columns: 52px 78px 52px;
          align-items: center;
          justify-content: center;
          gap: 18px;
        }

        .time {
          font-variant-numeric: tabular-nums;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-200);
          text-align: center;
          min-width: 52px;
          font-family: var(--font-family);
        }

        .playBtn {
          width: 78px;
          height: 78px;
          border-radius: 999px;
          border: 1px solid var(--muted-600);
          background: var(--accent-600);
          color: var(--text-100);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          font-size: 24px;
          font-weight: 800;
          line-height: 1;
          cursor: pointer;
          transition: var(--transition-base);
          box-shadow: none;
        }

        .playBtn:hover {
          transform: scale(1.02);
          opacity: 0.94;
        }

        .playBtn.on {
          background: var(--accent-600);
          color: var(--text-100);
        }

        .playIcon {
          width: 0;
          height: 0;
          border-top: 13px solid transparent;
          border-bottom: 13px solid transparent;
          border-left: 20px solid var(--text-100);
          transform: translateX(3px);
        }

        .pauseIcon {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }

        .pauseIcon span {
          width: 7px;
          height: 28px;
          border-radius: 999px;
          background: var(--text-100);
        }

        .pill {
          width: 48px !important;
          height: 48px;
          border-radius: 999px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-200);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          font-size: 12px;
          font-weight: 700;
          font-family: var(--font-family);
          cursor: pointer;
          transition: var(--transition-base);
        }

        .pill:hover {
          background: var(--bg-700);
          border-color: var(--muted-600);
          color: var(--text-100);
        }

        .rightTools {
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }
      `}</style>
    </div>
  );
}
