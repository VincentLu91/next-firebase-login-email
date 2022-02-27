import css from "styled-jsx/css";

export default css.global`
  .signin {
    max-width: 300px;
    margin-left: auto;
    margin-right: auto;
  }

  .signin > form {
    display: grid;
    flex-direction: column;
  }

  .signin > form > input {
    margin-bottom: 5px;
  }

  .signin__link:hover {
    text-decoration: underline;
  }

  .title {
    text-align: center;
    font-weight: 400;
    margin-bottom: 35px;
  }
`;
