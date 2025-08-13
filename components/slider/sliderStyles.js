import css from "styled-jsx/css";

export default css.global`
  .slider-container {
    --progress-bar-height: 6px;
    --progress-bar-bg: #e5e7eb; /* track (was white) */
    --progress-bar-fill: #1d4ed8; /* fill color (change if you prefer) */
    position: relative;
    width: 100%;
  }

  /* Background track */
  .slider-container::before {
    content: "";
    background-color: var(--progress-bar-bg);
    width: 100%;
    height: var(--progress-bar-height);
    display: block;
    position: absolute;
    border-radius: 10px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  /* Filled progress (driven by inline width in Slider.js) */
  .progress-bar-cover {
    background-color: var(--progress-bar-fill);
    width: 0%;
    height: var(--progress-bar-height);
    display: block;
    position: absolute;
    border-radius: 10px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
    user-select: none;
    pointer-events: none;
    transition: width 120ms ease;
  }

  /* Native range is invisible but interactive */
  .range {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    height: 24px; /* big hit area for cursor/touch */
    width: 100%;
    cursor: pointer;
    opacity: 0;
    margin: 0;
    position: relative;
    z-index: 2; /* sits above track/fill to catch input */
  }

  @media (prefers-color-scheme: dark) {
    .slider-container {
      --progress-bar-bg: #33415533; /* subtle slate for dark mode */
    }
  }
`;
