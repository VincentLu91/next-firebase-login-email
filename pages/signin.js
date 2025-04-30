import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { setCurrentUser } from "../redux/user/actions";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", content: "" });
  const router = useRouter();
  const dispatch = useDispatch();
  const supabase = useSupabaseClient();
  const session = useSession();

  const handleSignin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage({});

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage({ type: "error", content: error.message });
      } else if (data?.user) {
        dispatch(setCurrentUser(data.user));
      }
    } catch (error) {
      setMessage({
        type: "error",
        content: "An error occurred during sign in",
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

          <form onSubmit={handleSignin} className="flex flex-col space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-md px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-md px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              className={`mt-1 bg-[#943bdc] text-white hover:bg-[#7c32b8] border-[#943bdc] hover:border-[#7c32b8] hover:opacity-90 py-2 px-4 rounded-md ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <span className="pt-1 text-center text-sm">
            <span className="text-gray-600">Don&apos;t have an account?</span>
            {` `}
            <Link
              href="/signup"
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Sign up.
            </Link>
          </span>

          <span className="pt-1 text-center text-sm">
            <span className="text-gray-600">Forgot your password?</span>
            {` `}
            <Link
              href="/password-reset"
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Request a reset.
            </Link>
          </span>
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

export default SignIn;
