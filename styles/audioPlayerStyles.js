import css from "styled-jsx/css";

export default css.global`
  .audioplayer-body {
    /*background: #323232;*/
    height: 80vh;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    font-family: sans-serif;
  }

  .h1-center-bold {
    text-align: center;
    font-weight: 400;
    margin-bottom: 35px;
  }

  .audioplayer-container {
    width: 600px;
    padding: 0 10px;
    background-color: #8a2be2; /*originally #272727*/
    padding: 30px 50px;
    border-radius: 10px;
    box-shadow: 0px 5px 5px rgba(0, 0, 0, 0.479);
  }
`;
