import React, { useRef, useEffect } from "react";

import { useRouter } from "next/router";
import { useDispatch } from "react-redux";
import { setCurrentUser } from "../redux/user/actions";
import signInStyles from "../styles/signinStyles";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import Account from "../components/account";

const Signin = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const emailRef = useRef(null);

  const passwordRef = useRef(null);

  const session = useSession();
  const supabase = useSupabaseClient();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
      alert("You are logged in");
    }
  }, [session, router]);

  /*useEffect(() => {
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
    createUserWithEmailAndPassword(
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
    signInWithEmailAndPassword(
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

  const forgotPassword = (email) => {
    return sendPasswordResetEmail(auth, email)
      .then(() => {
        // Password reset email sent!
        console.log("email is sent...");
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        // ..
        console.log(errorCode);
        console.log(errorMessage);
      });
  };

  const forgotPasswordHandler = () => {
    const email = emailRef.current.value;
    if (email)
      forgotPassword(email).then(() => {
        emailRef.current.value = "";
      });
  };*/

  return (
    <div className="container" style={{ padding: "50px 0 100px 0" }}>
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        //theme="dark"
        //redirectTo="http://localhost:3001/password-reset"
      />
      {/*<>
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
          <p onClick={forgotPasswordHandler}>Forgot Password?</p>
        </form>
      </div>
      <style jsx>{signInStyles}</style>
  </>*/}
    </div>
  );
};

export default Signin;
