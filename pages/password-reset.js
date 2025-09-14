import React, { useEffect, useState } from "react";
import { supabase } from "../utils/initSupabase";
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { signinStyles } from "../styles/signinStyles";

const PasswordReset = () => {
  const [hash, setHash] = useState(() => {
    if (window.location.hash)
      sessionStorage.setItem("hash", window.location.hash);
    return window.location.hash;
  });

  const [formData, setFormData] = useState({
    password: "",
  });

  let session;
  const router = useRouter();

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
  }, []);

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!hash) {
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
          console.log("blast");
          return;
        }
        const { data, error } = await supabase.auth.updateUser({
          password: formData.password,
        });
        console.log("After calling updateUser(), data is: ", data);
        console.log(
          "After calling updateUser(), password is: ",
          formData.password
        );
        if (error) {
          console.log(error.message);
        } else if (!error) {
          console.log("changed");
          router.push("/signin");
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="w-80 flex flex-col justify-between p-3 max-w-lg m-auto my-64">
      <div className="signin-form">
        <h1 className="text-3xl font-bold">Confirm new Password</h1>
        <form onSubmit={handleSubmit} className="signin-form">
          <input
            placeholder="Password"
            name="password"
            type="password"
            onChange={handleChange}
            className="signin-input"
          />
          <button type="submit" className="btn-ghost w-[260px]">
            Submit
          </button>
        </form>
      </div>
      <style jsx>{signinStyles}</style>
    </div>
  );
};

export default PasswordReset;
