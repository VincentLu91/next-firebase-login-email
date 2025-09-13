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
        <div className="flex justify-center pb-12">
          <h1 className="text-3xl font-bold text-gray-700">Sign In</h1>
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

          <form onSubmit={handleSignin} className="block w-full">
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
            <div className="mb-6">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="flex flex-col space-y-4 pt-2">
            <div className="text-center text-sm">
              <span className="text-gray-600">Don&apos;t have an account?</span>
              {` `}
              <Link href="/signup" style={{ color: "var(--accent-400)" }}>
                Sign up.
              </Link>
            </div>

            <div className="text-center text-sm">
              <span className="text-gray-600">Forgot your password?</span>
              {` `}
              <Link
                href="/request-reset"
                style={{ color: "var(--accent-400)" }}
              >
                Request a reset.
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

export default SignIn;
