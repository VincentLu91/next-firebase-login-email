import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { useUser, useSupabaseClient } from "../utils/supabase-hooks";

// Credit packages with prices from environment variables
const CREDIT_PACKAGES = {
  mic_tokens: [
    {
      name: "Starter Pack",
      amount: 300,
      price: 4.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_MIC_START,
    },
    {
      name: "Standard Pack",
      amount: 600,
      price: 8.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_MIC_STANDARD,
    },
    {
      name: "Pro Pack",
      amount: 1200,
      price: 15.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_MIC_PRO,
    },
    {
      name: "Business Pack",
      amount: 3000,
      price: 34.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_MIC_BIZ,
    },
  ],
  num_calls: [
    {
      name: "Starter Pack",
      amount: 10,
      price: 4.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_CALL_START,
    },
    {
      name: "Standard Pack",
      amount: 20,
      price: 8.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_CALL_STANDARD,
    },
    {
      name: "Pro Pack",
      amount: 40,
      price: 15.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_CALL_PRO,
    },
    {
      name: "Business Pack",
      amount: 60,
      price: 34.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_CALL_BIZ,
    },
  ],
};

export default function BuyCredits() {
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [tokenType, setTokenType] = useState("mic_tokens");
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();

  useEffect(() => {
    const fetchCustomer = async () => {
      if (user) {
        const { data } = await supabase
          .from("customers")
          .select("*")
          .eq("id", user.id)
          .single();
        setCustomer(data);
      }
    };
    fetchCustomer();
  }, [user, supabase]);

  const purchaseCredits = async (pkg) => {
    setLoading(true);
    if (!user) {
      router.push("/signin");
      return;
    }

    try {
      const response = await axios.post("/api/buy-credits-checkout", {
        success_url: `${window.location.origin}/dashboard?purchase=success`,
        cancel_url: window.location.href,
        price_id: pkg.stripe_price_id,
        user_id: user.id,
        user_email: user.email,
        token_type: tokenType,
        token_amount: pkg.amount,
      });

      window.location.href = response.data.url;
    } catch (error) {
      console.error(
        "Error during credit purchase:",
        error.response?.data || error,
      );
      alert("Failed to initiate purchase. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section">
      <div className="container">
        <button className="back-button" onClick={() => router.back()}>
          ← Back
        </button>

        <h1 className="title">Buy Additional Credits</h1>
        <p className="subtitle">
          Top up your account with additional credits on top of your existing
          subscription
        </p>

        {customer && (
          <div className="current-balance">
            <h2 className="balance-title">Your Current Balance</h2>
            <div className="balance-grid">
              <div className="balance-item">
                <div className="balance-label">Microphone Tokens</div>
                <div className="balance-value">{customer.mic_tokens || 0}</div>
              </div>
              <div className="balance-item">
                <div className="balance-label">Number of Calls</div>
                <div className="balance-value">{customer.num_calls || 0}</div>
              </div>
            </div>
          </div>
        )}

        <div className="tab-container">
          <button
            className={`tab ${tokenType === "mic_tokens" ? "active" : ""}`}
            onClick={() => setTokenType("mic_tokens")}
          >
            Microphone Tokens
          </button>
          <button
            className={`tab ${tokenType === "num_calls" ? "active" : ""}`}
            onClick={() => setTokenType("num_calls")}
          >
            Call Tokens
          </button>
        </div>

        <div className="cards-container">
          {CREDIT_PACKAGES[tokenType].map((pkg, index) => (
            <div className="card" key={index}>
              <h3 className="package-name">{pkg.name}</h3>
              <div className="token-amount">
                {pkg.amount} {tokenType === "mic_tokens" ? "Mic" : "Call"}{" "}
                Tokens
              </div>
              <div className="price-container">
                <span className="price">${pkg.price.toFixed(2)}</span>
              </div>
              <button
                className="button"
                onClick={() => purchaseCredits(pkg)}
                disabled={loading}
              >
                {loading ? "Processing..." : "Purchase"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .section {
          background: #0e0e0f;
          position: relative;
          min-height: 100vh;
        }

        .section::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at 40% 30%,
            rgba(123, 92, 255, 0.05) 0%,
            transparent 60%
          );
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 5rem 1.5rem;
          position: relative;
        }

        .title {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: rgba(255, 255, 255, 0.95);
          text-align: center;
          margin-bottom: 1rem;
        }

        .subtitle {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          margin-bottom: 3rem;
        }

        .current-balance {
          background: #1a1a1d;
          border-radius: 1rem;
          padding: 2rem;
          margin-bottom: 3rem;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .balance-title {
          font-size: 18px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 1rem;
        }

        .balance-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .balance-item {
          background: rgba(123, 92, 255, 0.1);
          border-radius: 0.5rem;
          padding: 1.5rem;
          border: 1px solid rgba(123, 92, 255, 0.2);
        }

        .balance-label {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 0.5rem;
        }

        .balance-value {
          font-size: 28px;
          font-weight: 700;
          color: #7b5cff;
        }

        .cards-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-top: 2rem;
        }

        .card {
          background: #1a1a1d;
          padding: 2rem;
          border-radius: 1rem;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transition: all 250ms cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .card:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 8px 24px rgba(123, 92, 255, 0.25);
        }

        .package-name {
          font-size: 20px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 0.5rem;
        }

        .token-amount {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 1.5rem;
        }

        .price-container {
          margin: 1.5rem 0;
        }

        .price {
          font-size: 36px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
        }

        .button {
          width: 100%;
          padding: 0.875rem 2rem;
          border-radius: 0.5rem;
          font-weight: 500;
          position: relative;
          background: transparent;
          color: rgba(255, 255, 255, 0.95);
          border: 1px solid #7b5cff;
          cursor: pointer;
          transition: all 250ms cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .button:hover:not(:disabled) {
          background: linear-gradient(to right, #7b5cff, #985cff);
          box-shadow: 0 0 12px rgba(123, 92, 255, 0.4);
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .back-button {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.85);
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 2rem;
          transition: all 200ms;
        }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .tab-container {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 3rem;
        }

        .tab {
          padding: 0.75rem 2rem;
          border-radius: 0.5rem;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 200ms;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.95);
          box-shadow: none;
        }

        .tab:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .tab.active {
          background: linear-gradient(to right, #7b5cff, #985cff);
          box-shadow: 0 0 12px rgba(123, 92, 255, 0.4);
        }

        .tab.active:hover {
          background: linear-gradient(to right, #7b5cff, #985cff);
        }
      `}</style>
    </section>
  );
}
