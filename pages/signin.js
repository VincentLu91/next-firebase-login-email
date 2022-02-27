import React, { useRef, useEffect } from "react";
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useRouter } from "next/router";
import { useDispatch } from "react-redux";
import { setCurrentUser } from "../redux/user/actions";
import { onAuthStateChanged } from "firebase/auth";
import signInStyles from "../styles/signinStyles";

const Signin = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const emailRef = useRef(null);

  const passwordRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      console.log(authUser); // uid
      if (authUser) {
        dispatch(setCurrentUser(authUser));
        router.push("/dashboard");
      }
    });

    return unsubscribe;
  }, [dispatch, router]);

  const signUp = (e) => {
    e.preventDefault();
    /*auth.*/ createUserWithEmailAndPassword(
      auth,
      emailRef.current.value,
      passwordRef.current.value
    )
      .then((user) => {
        console.log(user);
      })
      .catch((err) => {
        console.log(err);
      });
  };
  const signIn = (e) => {
    e.preventDefault();
    /*auth.*/ signInWithEmailAndPassword(
      auth,
      emailRef.current.value,
      passwordRef.current.value
    )
      .then((userData) => {
        //console.log("userData is: ", userData);
        dispatch(setCurrentUser(userData));
        //updateUser({ ...user, user: userData.user });
        //navigate("/dashboard");
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <>
      <div className="signin">
        <form action="">
          <h1 className="title">Sign in</h1>
          <input ref={emailRef} type="email" />
          <input ref={passwordRef} type="password" />
          <button onClick={signIn}>Sign in </button>
          <h6>
            Not yet register?{" "}
            <span onClick={signUp} className="signin__link">
              Sign up
            </span>
          </h6>
        </form>
      </div>
      <style jsx>{signInStyles}</style>
    </>
  );
};

export default Signin;
