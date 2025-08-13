import { useState, useRef, useEffect } from "react";
import sliderStyles from "./sliderStyles";
import thumbStyles from "./thumbStyles";

export default function Slider({ percentage = 0, onChange }) {
  const [position, setPosition] = useState(0);
  const [marginLeft, setMarginLeft] = useState(0);
  const [progressBarWidth, setProgressBarWidth] = useState(0);

  const rangeRef = useRef(null);
  const thumbRef = useRef(null);

  useEffect(() => {
    const rangeWidth = rangeRef.current?.getBoundingClientRect().width || 0;
    const thumbWidth = thumbRef.current?.getBoundingClientRect().width || 0;
    const centerThumb = (thumbWidth / 100) * percentage * -1;
    const centerProgressBar =
      thumbWidth +
      (rangeWidth / 100) * percentage -
      (thumbWidth / 100) * percentage;

    setPosition(percentage);
    setMarginLeft(centerThumb);
    setProgressBarWidth(Math.max(0, centerProgressBar));
  }, [percentage]);

  return (
    <div className="slider-container" aria-label="Seek bar">
      {/* visible track (bg) is drawn by ::before in sliderStyles */}
      <div
        className="progress-bar-cover"
        style={{ width: `${progressBarWidth}px` }}
        aria-hidden="true"
      />
      <div
        className="thumb"
        ref={thumbRef}
        style={{ left: `${position}%`, marginLeft: `${marginLeft}px` }}
        aria-hidden="true"
      />
      <input
        type="range"
        className="range"
        ref={rangeRef}
        value={position}
        min={0}
        max={100}
        step="0.01"
        onChange={onChange}
        onInput={onChange}
        aria-label="Seek"
      />

      <style jsx>{sliderStyles}</style>
      <style jsx>{thumbStyles}</style>
    </div>
  );
}
