import { supabase } from "../utils/initSupabase";
import React, { useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { signinStyles } from "../styles/signinStyles";

function RequestReset() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const notification = toast.loading("Sending Email...");

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/password-reset`,
      });

      if (error) {
        toast.error(error.message, {
          id: notification,
        });
      } else if (data) {
        toast.success("Reset email sent successfully", {
          id: notification,
        });
        alert(
          "Your password reset email has been sent. Please check your spam folder if you don't see it in your inbox."
        );
      }
    } catch (error) {
      toast.error("An error occurred while sending reset email", {
        id: notification,
      });
    }
    setLoading(false);
  };

  return (
    <div className="w-80 flex flex-col justify-between p-3 max-w-lg m-auto my-64">
      <div className="signin-form">
        <h1 className="text-3xl font-bold">Reset Password</h1>
        <form onSubmit={handleSubmit} className="signin-form">
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="signin-input"
          />
          <button
            className={`btn-ghost w-[260px] ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            type="submit"
            disabled={loading}
          >
            {loading ? "Sending..." : "Request Password Reset"}
          </button>
        </form>
        <div className="flex flex-col space-y-4 pt-2">
          <div className="text-center text-sm">
            <span className="text-gray-600">Remember your password?</span>
            {` `}
            <Link href="/signin" style={{ color: "var(--accent-400)" }}>
              Sign in.
            </Link>
          </div>
        </div>
      </div>
      <style jsx>{signinStyles}</style>
    </div>
  );
}

export default RequestReset;
