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
      <div className="controlsRow">
        <button
          className="iconBtn"
          onClick={() => clampSeek(-10)}
          aria-label="Rewind 10 seconds"
        >
          <span className="skipIcon">↺</span>
          <span className="skipText">10</span>
        </button>

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

        <button
          className="iconBtn"
          onClick={() => clampSeek(10)}
          aria-label="Forward 10 seconds"
        >
          <span className="skipText">10</span>
          <span className="skipIcon">↻</span>
        </button>
      </div>

      <div className="timeRow">
        <span className="time">{t(effectiveTime)}</span>
        <span className="time">{t(effectiveDuration)}</span>
      </div>

      <style jsx>{`
        .cp {
          width: 100%;
          padding: 0;
        }

        .controlsRow {
          width: 100%;
          display: grid;
          grid-template-columns: 64px 78px 64px;
          align-items: center;
          justify-content: center;
          gap: 72px;
          margin-bottom: 28px;
        }

        .iconBtn {
          width: 64px;
          height: 48px;
          border: none;
          background: transparent;
          color: var(--text-100);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 0;
          cursor: pointer;
          transition: var(--transition-base);
          opacity: 0.95;
        }

        .iconBtn:hover {
          opacity: 1;
          transform: scale(1.03);
        }

        .skipIcon {
          font-size: 26px;
          line-height: 1;
        }

        .skipText {
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
        }

        .playBtn {
          width: 78px;
          height: 78px;
          border-radius: 999px;
          border: none;
          background: var(--accent-600);
          color: var(--text-100);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
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
        }

        .playIcon {
          width: 0;
          height: 0;
          border-top: 15px solid transparent;
          border-bottom: 15px solid transparent;
          border-left: 24px solid var(--text-100);
          transform: translateX(4px);
        }

        .pauseIcon {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .pauseIcon span {
          width: 8px;
          height: 30px;
          border-radius: 999px;
          background: var(--text-100);
        }

        .timeRow {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .time {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-200);
          font-variant-numeric: tabular-nums;
          font-family: var(--font-family);
        }
      `}</style>
    </div>
  );
}
