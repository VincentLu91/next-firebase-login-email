import { supabase } from "../utils/initSupabase";
import React, { useState } from "react";
import toast from "react-hot-toast";

function RequestReset() {
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

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
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Request Password Reset</button>
      </form>
    </div>
  );
}

export default RequestReset;
