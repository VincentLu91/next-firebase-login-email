import React from "react";
import { useRouter } from "next/router";
import styles from "../styles/Home.module.css";

// this page can be edited later with live plans for production purposes.
const Pricing = () => {
  const router = useRouter();
  return (
    <main className={styles["main-mini"]}>
      <h1>Pricing</h1>
      <p className="fs-5 text-muted">Below is the list of pricing plans</p>
      <div className="row row-cols-1 row-cols-md-3">
        <div className={styles["alt-grid"]}>
          <div className={styles["alt-card"]}>
            <div className="card text-center">
              <div className="card-header">
                <h4 className="fw-normal">Free</h4>
              </div>
              <div className="card-body">
                <h1 className="card-title">
                  $0 <small className="text-muted fw-light">/mo</small>
                </h1>
                <ul className="list-unstyled py-3">
                  <li>10 users included</li>
                  <li>10GB of storage</li>
                  <li>Priority email support</li>
                  <li>Help center access</li>
                </ul>
                <button onClick={() => router.push("/signin")}>
                  Sign Up Free
                </button>
              </div>
            </div>
          </div>
          <div className={styles["alt-card"]}>
            <div className="card text-center">
              <div className="card-header">
                <h4 className="fw-normal">Pro</h4>
              </div>
              <div className="card-body">
                <h1 className="card-title">
                  $20 <small className="text-muted fw-light">/mo</small>
                </h1>
                <ul className="list-unstyled py-3">
                  <li>20 users included</li>
                  <li>10GB of storage</li>
                  <li>Priority email support</li>
                  <li>Help center access</li>
                </ul>
                <button onClick={() => router.push("/signin")}>
                  Get Started
                </button>
              </div>
            </div>
          </div>
          <div className={styles["alt-card"]}>
            <div className="card text-center">
              <div className="card-header">
                <h4 className="fw-normal">Enterprise</h4>
              </div>
              <div className="card-body">
                <h1 className="card-title">
                  $30 <small className="text-muted fw-light">/mo</small>
                </h1>
                <ul className="list-unstyled py-3">
                  <li>30 users included</li>
                  <li>10GB of storage</li>
                  <li>Priority email support</li>
                  <li>Help center access</li>
                </ul>
                <button onClick={() => router.push("/signin")}>
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </div>
        <h2 className={styles["main-mini"]}>Compare Plan</h2>
        <div className={styles["main-mini"]}>
          <table className="table text-center">
            <thead>
              <tr>
                <th style={{ width: "34%" }}></th>
                <th style={{ width: "22%" }}>Free</th>
                <th style={{ width: "22%" }}>Pro</th>
                <th style={{ width: "22%" }}>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Public</th>
                <td>&#10003;</td>
                <td>&#10003;</td>
                <td>&#10003;</td>
              </tr>
              <tr>
                <th>Private</th>
                <td></td>
                <td>&#10003;</td>
                <td>&#10003;</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default Pricing;
