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
    max-width: 920px;
    margin: 0 auto;
    background: radial-gradient(
        circle at top left,
        rgba(167, 139, 250, 0.16),
        transparent 34%
      ),
      linear-gradient(180deg, var(--bg-700), var(--bg-800));
    border: 1px solid var(--muted-600);
    border-radius: 24px;
    padding: 20px;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.26);
  }

  .h1-center-bold {
    text-align: left;
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
