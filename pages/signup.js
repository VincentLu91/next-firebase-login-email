import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { setCurrentUser } from "../redux/user/actions";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", content: "" });
  const router = useRouter();
  const dispatch = useDispatch();
  const supabase = useSupabaseClient();
  const session = useSession();

  const handleSignup = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage({ type: "error", content: "Passwords do not match" });
      return;
    }

    setLoading(true);
    setMessage({});

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage({ type: "error", content: error.message });
      } else if (data?.user) {
        // Initialize free tokens for the new user
        try {
          const response = await fetch("/api/initializeFreeUser", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: data.user.id,
              email: email,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            console.error("Token initialization error:", result);
            setMessage({
              type: "warning",
              content: `Account created successfully. ${
                result.error === "User tokens already initialized"
                  ? "Your tokens are already set up."
                  : "There was an issue setting up your free tokens. Please try again later or contact support."
              }`,
            });
          } else {
            setMessage({
              type: "success",
              content:
                "Registration successful! Please check your email to confirm your account. Your free tokens have been initialized.",
            });
          }
        } catch (tokenError) {
          console.error("Error initializing free tokens:", tokenError);
          setMessage({
            type: "warning",
            content:
              "Account created successfully, but there was an issue setting up your free tokens. Please try again later or contact support.",
          });
        }
        dispatch(setCurrentUser(data.user));
      }
    } catch (error) {
      setMessage({
        type: "error",
        content: "An error occurred during sign up",
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    if (session) {
      router.replace("/dashboard");
    }
  }, [session, router]);

  if (!session)
    return (
      <div className="w-80 flex flex-col justify-between p-3 max-w-lg m-auto my-64">
        <div className="flex justify-center pb-12">
          <h1 className="text-3xl font-bold text-gray-700">Sign Up</h1>
        </div>
        <div className="flex flex-col space-y-4">
          {message.content && (
            <div
              className={`${
                message.type === "error" ? "text-pink-500" : "text-green-500"
              } border ${
                message.type === "error"
                  ? "border-pink-500"
                  : "border-green-500"
              } p-3`}
            >
              {message.content}
            </div>
          )}

          <form onSubmit={handleSignup} className="block w-full">
            <div className="mb-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full rounded-md px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full rounded-md px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-6">
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="block w-full rounded-md px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              className={`block w-full bg-[#943bdc] text-white hover:bg-[#7c32b8] border-[#943bdc] hover:border-[#7c32b8] hover:opacity-90 py-2 px-4 rounded-md ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing up..." : "Sign up"}
            </button>
          </form>

          <div className="flex flex-col space-y-4 pt-2">
            <div className="text-center text-sm">
              <span className="text-gray-600">Already have an account?</span>
              {` `}
              <Link
                href="/signin"
                className="text-blue-600 font-bold hover:underline cursor-pointer"
              >
                Sign in.
              </Link>
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="m-6">
      <div className="animate-pulse flex space-x-4 justify-center">
        <div className="rounded-full bg-slate-200 h-10 w-10"></div>
        <div className="rounded-full bg-slate-200 h-10 w-10"></div>
        <div className="rounded-full bg-slate-200 h-10 w-10"></div>
      </div>
    </div>
  );
};

export default SignUp;
