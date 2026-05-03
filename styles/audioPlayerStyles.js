import css from "styled-jsx/css";

export default css.global`
  .audioplayer-body {
    padding: 18px 0 0;
    display: flex;
    justify-content: center;
    color: var(--text-100);
    background: transparent;
  }

  .audioplayer-container {
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 0;
    box-shadow: none;
  }

  .h1-center-bold {
    text-align: center;
    font-weight: 800;
    font-size: 28px;
    color: var(--text-100);
    margin: 0 0 12px;
  }

  .transcript {
    margin: 24px auto 64px;
    max-width: 68ch;
  }

  .transcript h3 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 700;
    color: var(--text-200);
  }

  .transcriptBody {
    line-height: 1.7;
    color: var(--text-200);
    text-align: left;
  }
`;
