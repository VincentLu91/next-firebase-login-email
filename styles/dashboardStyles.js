import css from "styled-jsx/css";

export default css.global`
  .plans {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-left: auto;
    margin-right: auto;
    /* max-width: 500px; */
    margin: 2rem 0;
  }

  .plans-container {
    max-width: 70vw;
    margin: 2rem auto;
    margin-top: 100px;
  }

  .logout {
    background: #e74c3c;
  }

  .subscribed {
    background: #2c3e50;
  }

  .title {
    font-weight: 400;
  }

  .center {
    text-align: center;
    margin-bottom: 35px;
  }
`;
