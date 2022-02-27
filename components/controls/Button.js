import React from "react";
import styles from "./button.module.css";

function Button({ play, isPlaying }) {
  return (
    <div className={styles["btn-container"]}>
      <div
        onClick={play}
        className={isPlaying ? styles["btn-stop"] : styles["btn-play"]}
      ></div>
    </div>
  );
}
export default Button;
