import css from "styled-jsx/css";

export default css.global`
  .audioplayer-body {
    padding: 24px 0 40px;
    display: flex;
    justify-content: center;
    color: #0f172a;
    background: transparent;
  }

  .audioplayer-container {
    width: 100%;
    max-width: 920px;
    margin: 16px auto;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  }

  .h1-center-bold {
    text-align: left;
    font-weight: 700;
    font-size: 28px;
    color: #0f172a;
    margin: 0 0 12px;
  }

  /* transcript section (optional if you render it here) */
  .transcript {
    margin: 24px auto 64px;
    max-width: 68ch;
  }
  .transcript h3 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: #475569;
  }
  .transcriptBody {
    line-height: 1.7;
    color: #111827;
    text-align: left;
  }
`;
