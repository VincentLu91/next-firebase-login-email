import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { useUser, useSupabaseClient } from "../utils/supabase-hooks";
import styled from "styled-components";

const Section = styled.section`
  background: #0e0e0f;
  position: relative;
  min-height: 100vh;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 40% 30%,
      rgba(123, 92, 255, 0.05) 0%,
      transparent 60%
    );
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 5rem 1.5rem;
  position: relative;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: rgba(255, 255, 255, 0.95);
  text-align: center;
  margin-bottom: 1rem;
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  margin-bottom: 3rem;
`;

const CurrentBalance = styled.div`
  background: #1a1a1d;
  border-radius: 1rem;
  padding: 2rem;
  margin-bottom: 3rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
`;

const BalanceTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 1rem;
`;

const BalanceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
`;

const BalanceItem = styled.div`
  background: rgba(123, 92, 255, 0.1);
  border-radius: 0.5rem;
  padding: 1.5rem;
  border: 1px solid rgba(123, 92, 255, 0.2);
`;

const BalanceLabel = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.5rem;
`;

const BalanceValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: #7b5cff;
`;

const CardsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
`;

const Card = styled.div`
  background: #1a1a1d;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: all 250ms cubic-bezier(0.25, 0.8, 0.25, 1);

  &:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: 0 8px 24px rgba(123, 92, 255, 0.25);
  }
`;

const PackageName = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 0.5rem;
`;

const TokenAmount = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 1.5rem;
`;

const PriceContainer = styled.div`
  margin: 1.5rem 0;
`;

const Price = styled.span`
  font-size: 36px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
`;

const Button = styled.button`
  width: 100%;
  padding: 0.875rem 2rem;
  border-radius: 0.5rem;
  font-weight: 500;
  position: relative;
  background: transparent;
  color: rgba(255, 255, 255, 0.95);
  border: none;
  cursor: pointer;
  transition: all 250ms cubic-bezier(0.25, 0.8, 0.25, 1);

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 0.5rem;
    padding: 1px;
    background: linear-gradient(to right, #7b5cff, #985cff);
    -webkit-mask: linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }

  &:hover {
    background: linear-gradient(to right, #7b5cff, #985cff);
    box-shadow: 0 0 12px rgba(123, 92, 255, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const BackButton = styled.button`
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

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const TabContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 3rem;
`;

const Tab = styled.button`
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 200ms;
  background: ${(props) =>
    props.active
      ? "linear-gradient(to right, #7b5cff, #985cff)"
      : "rgba(255, 255, 255, 0.05)"};
  color: rgba(255, 255, 255, 0.95);
  box-shadow: ${(props) =>
    props.active ? "0 0 12px rgba(123, 92, 255, 0.4)" : "none"};

  &:hover {
    background: ${(props) =>
      props.active
        ? "linear-gradient(to right, #7b5cff, #985cff)"
        : "rgba(255, 255, 255, 0.1)"};
  }
`;

// Credit packages with prices from environment variables
const CREDIT_PACKAGES = {
  mic_tokens: [
    {
      name: "Starter Pack",
      amount: 300,
      price: 4.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_MIC_300,
    },
    {
      name: "Standard Pack",
      amount: 600,
      price: 8.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_MIC_600,
    },
    {
      name: "Pro Pack",
      amount: 1200,
      price: 15.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_MIC_1200,
    },
    {
      name: "Business Pack",
      amount: 3000,
      price: 34.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_MIC_3000,
    },
  ],
  num_calls: [
    {
      name: "Starter Pack",
      amount: 10,
      price: 4.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_CALL_10,
    },
    {
      name: "Standard Pack",
      amount: 20,
      price: 8.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_CALL_20,
    },
    {
      name: "Pro Pack",
      amount: 40,
      price: 15.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_CALL_40,
    },
    {
      name: "Business Pack",
      amount: 60,
      price: 34.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_CALL_60,
    },
  ],
};

const BuyCredits = () => {
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
        error.response?.data || error
      );
      alert("Failed to initiate purchase. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section>
      <Container>
        <BackButton onClick={() => router.back()}>← Back</BackButton>

        <Title>Buy Additional Credits</Title>
        <Subtitle>
          Top up your account with additional credits on top of your existing
          subscription
        </Subtitle>

        {customer && (
          <CurrentBalance>
            <BalanceTitle>Your Current Balance</BalanceTitle>
            <BalanceGrid>
              <BalanceItem>
                <BalanceLabel>Microphone Tokens</BalanceLabel>
                <BalanceValue>{customer.mic_tokens || 0}</BalanceValue>
              </BalanceItem>
              {/*<BalanceItem>
                <BalanceLabel>Call Tokens</BalanceLabel>
                <BalanceValue>{customer.call_tokens || 0}</BalanceValue>
              </BalanceItem>*/}
              {/* ignore call_tokens that's a ghost value.*/}
              <BalanceItem>
                <BalanceLabel>Number of Calls</BalanceLabel>
                <BalanceValue>{customer.num_calls || 0}</BalanceValue>
              </BalanceItem>
            </BalanceGrid>
          </CurrentBalance>
        )}

        <TabContainer>
          <Tab
            active={tokenType === "mic_tokens"}
            onClick={() => setTokenType("mic_tokens")}
          >
            Microphone Tokens
          </Tab>
          <Tab
            active={tokenType === "num_calls"}
            onClick={() => setTokenType("num_calls")}
          >
            Call Tokens
          </Tab>
        </TabContainer>

        <CardsContainer>
          {CREDIT_PACKAGES[tokenType].map((pkg, index) => (
            <Card key={index}>
              <PackageName>{pkg.name}</PackageName>
              <TokenAmount>
                {pkg.amount} {tokenType === "mic_tokens" ? "Mic" : "Call"}{" "}
                Tokens
              </TokenAmount>
              <PriceContainer>
                <Price>${pkg.price.toFixed(2)}</Price>
              </PriceContainer>
              <Button onClick={() => purchaseCredits(pkg)} disabled={loading}>
                {loading ? "Processing..." : "Purchase"}
              </Button>
            </Card>
          ))}
        </CardsContainer>
      </Container>
    </Section>
  );
};

export default BuyCredits;
