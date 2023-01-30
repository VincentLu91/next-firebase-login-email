import React, { useEffect, useState } from "react";
import { supabase } from "../utils/initSupabase";

const PasswordReset = () => {
  // tried https://www.youtube.com/watch?v=Tk2KuBOy2zk
  // but ran into issues. Had to make a few changes, hence the commented LOCs below.
  //const [password, setPassword] = useState(null);
  const [hash, setHash] = useState(() => {
    if (window.location.hash)
      sessionStorage.setItem("hash", window.location.hash);
    return window.location.hash;
  });

  const [formData, setFormData] = useState({
    password: "",
  });
  console.log("password is: ", formData.password);
  function handleChange(event) {
    setFormData((prevFormData) => {
      return {
        ...prevFormData,
        [event.target.name]: event.target.value,
      };
    });
  }

  useEffect(() => {
    console.log("test >>>>>", sessionStorage.getItem("hash"));
    setHash(sessionStorage.getItem("hash"));
    //setHash(window.location.hash);
    /*  const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, _session) => {
          console.log(`Supbase auth event: ${event}`);
          setSession(_session);
        }
      );
      return () => {
        authListener.subscription.unsubscribe();
      };*/
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!hash) {
        //return toast.error("No access token");
        console.log("No access token");
        return;
      } else if (hash) {
        const hashArr = hash
          .substring(1)
          .split("&")
          .map((param) => param.split("="));

        let type;
        let accessToken;

        for (const [key, value] of hashArr) {
          if (key === "type") {
            type = value;
          } else if (key === "access_token") {
            accessToken = value;
          }
        }

        if (
          type !== "recovery" ||
          !accessToken ||
          typeof accessToken == "object"
        ) {
          //return toast("blast");
          console.log("blast");
          return;
        }

        const { data, error } = await supabase.auth.updateUser(
          /*accessToken,*/ {
            //password: password,
            password: formData.password,
          }
        );

        console.log("After calling updateUser(), data is: ", data);
        console.log(
          "After calling updateUser(), password is: ",
          formData.password
        );

        if (error) {
          //toast.error(error.message);
          console.log(error.message);
        } else if (!error) {
          //toast.success("changed");
          console.log("changed");
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      {/*<form>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.password)}
        />
      </form>
      <button onClick={handleSubmit} type="submit">
        Submit
  </button>*/}
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Password"
          name="password"
          type="password"
          onChange={handleChange}
        />

        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default PasswordReset;
