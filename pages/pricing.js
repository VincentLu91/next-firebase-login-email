import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
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
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.2px;
  color: rgba(255, 255, 255, 0.95);
  text-align: center;
  margin-bottom: 2rem;
`;

const IntervalToggle = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 3rem;
`;

const ToggleContainer = styled.div`
  position: relative;
  height: 2rem;
  background: #1a1a1d;
  border-radius: 9999px;
  width: 14rem;
  display: flex;
  align-items: center;
  padding: 0.25rem;
`;

const ToggleButton = styled.button`
  position: relative;
  width: 50%;
  height: 1.5rem;
  border-radius: 9999px;
  transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  background: ${(props) =>
    props.selected
      ? "linear-gradient(to right, #7B5CFF, #985CFF)"
      : "transparent"};
  box-shadow: ${(props) =>
    props.selected ? "0 0 12px rgba(123,92,255,0.35)" : "none"};
  border: none;
  cursor: pointer;

  span {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 500;
    color: ${(props) => (props.selected ? "white" : "rgba(255,255,255,0.85)")};
  }
`;

const SaveBadge = styled.span`
  margin-left: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #7b5cff;
  background: rgba(123, 92, 255, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  opacity: ${(props) => (props.visible ? 1 : 0)};
  transition: opacity 150ms;
`;

const CardsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-top: 3rem;
  grid-auto-flow: row;
  grid-template-rows: auto;

  & > * {
    grid-column: auto;
  }

  & > *:last-child:nth-child(3n-1) {
    grid-column: 2;
  }

  & > *:last-child:nth-child(3n-2) {
    grid-column: 2;
  }

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);

    & > *:last-child:nth-child(2n-1) {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 750px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: #1a1a1d;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: all 250ms cubic-bezier(0.25, 0.8, 0.25, 1);
  width: 100%;

  ${(props) =>
    props.isCurrentPlan &&
    `
    box-shadow: 0 0 0 2px #7B5CFF;
  `}

  &:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: 0 8px 24px rgba(123, 92, 255, 0.25);
  }
`;

const PlanName = styled.h2`
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.2px;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 0.5rem;
`;

const Description = styled.p`
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 2rem;
`;

const PriceContainer = styled.div`
  margin: 2rem 0;
`;

const Price = styled.span`
  font-size: 48px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
`;

const PriceInterval = styled.span`
  color: rgba(255, 255, 255, 0.85);
  margin-left: 0.5rem;
`;

const FeatureList = styled.ul`
  margin: 2rem 0;
  space-between: 1rem;
`;

const Feature = styled.li`
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 1rem;

  svg {
    width: 1rem;
    height: 1rem;
    color: #7b5cff;
    margin-right: 0.75rem;
    flex-shrink: 0;
  }
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

const Pricing = () => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [interval, setInterval] = useState("month");
  const [showAnnualSavings, setShowAnnualSavings] = useState(false);
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();

  const getProductsDisplay = useCallback(async () => {
    let productsData = await supabase
      .from("products")
      .select("*, prices(*)")
      .eq("active", true);
    console.log("Products are: ", productsData);
    setProducts(productsData.data || []);
  }, [supabase]);

  useEffect(() => {
    getProductsDisplay();
  }, [getProductsDisplay]);

  useEffect(() => {
    setShowAnnualSavings(false);
    if (interval === "year") {
      setTimeout(() => setShowAnnualSavings(true), 50);
    }
  }, [interval]);

  useEffect(() => {
    const checkAuth = async () => {
      if (user) {
        let customerInfo = await supabase
          .from("customers")
          .select("*")
          .eq("email_address", user.email);
        setCustomer(customerInfo.data?.[0]);

        if (customerInfo.data?.[0]) {
          let subscriptionResponse = await supabase
            .from("subscriptions")
            .select()
            .eq("customer_id", customerInfo.data[0].id);

          if (subscriptionResponse.data?.[0]) {
            setSubscriptionInfo(subscriptionResponse.data[0]);
          }
        }
      }
    };
    checkAuth();
  }, [user, supabase]);

  const switchPlan = async (subscription_id, stripe_price_id) => {
    setLoading(true);
    try {
      const response = await axios.post("/api/switch-plan", {
        subscription_id,
        customer,
        return_url: `${window.location.origin}/dashboard`,
      });
      window.location.href = response.data.url;
    } catch (error) {
      console.error("Error switching plan:", error);
      setLoading(false);
    }
  };

  const checkOut = async (priceId) => {
    setLoading(true);
    if (!user) {
      router.push("/signin");
      return;
    }

    try {
      console.log("Checkout payload:", {
        success_url: `${window.location.origin}/subscription-checkout`,
        cancel_url: window.location.href,
        stripe_customer_id: customer?.stripe_customer_id,
        price_id: priceId,
        user_id: user.id,
        user_email: user.email,
      });
      const response = await axios.post("/api/checkout_session", {
        success_url: `${window.location.origin}/subscription-checkout`,
        cancel_url: window.location.href,
        stripe_customer_id: customer?.stripe_customer_id,
        price_id: priceId,
        user_id: user.id,
        user_email: user.email,
      });

      window.location.href = response.data.url;
    } catch (error) {
      console.error("Error during checkout:", error.response?.data || error);
    } finally {
      setLoading(false);
    }
  };

  if (!products.length) {
    return (
      <Section>
        <Container>
          <Title>No subscription pricing plans found.</Title>
        </Container>
      </Section>
    );
  }

  return (
    <Section>
      <Container>
        <Title>Choose Your Plan</Title>

        <IntervalToggle>
          <ToggleContainer>
            <ToggleButton
              selected={interval === "month"}
              onClick={() => setInterval("month")}
            >
              <span>Monthly</span>
            </ToggleButton>
            <ToggleButton
              selected={interval === "year"}
              onClick={() => setInterval("year")}
            >
              <span>Yearly</span>
            </ToggleButton>
          </ToggleContainer>
          {interval === "year" && (
            <SaveBadge visible={showAnnualSavings}>Save 18% yearly</SaveBadge>
          )}
        </IntervalToggle>
        <CardsContainer>
          {products.map((product) => {
            const price = product.prices?.find(
              (p) => p.interval === interval && p.active === true
            );
            if (!price) return null;

            const priceString = new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: price.currency || "USD",
              minimumFractionDigits: 0,
            }).format((price.unit_amount || 0) / 100);

            const isCurrentPlan =
              subscriptionInfo?.stripe_price_id === price.stripe_price_id;

            return (
              <Card key={product.id} isCurrentPlan={isCurrentPlan}>
                <PlanName>{product.product_name}</PlanName>
                <Description>{product.description}</Description>
                <PriceContainer>
                  <Price>{priceString}</Price>
                  <PriceInterval>/{interval}</PriceInterval>
                </PriceContainer>

                <FeatureList>
                  <Feature>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {price.mic_tokens} Microphone Minutes
                  </Feature>
                  <Feature>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {price.call_tokens} Call Minutes
                  </Feature>
                  <Feature>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {price.num_calls} Number of Calls
                  </Feature>
                </FeatureList>

                <Button
                  onClick={() => {
                    if (!user) {
                      checkOut(price.stripe_price_id);
                      return;
                    }

                    if (subscriptionInfo) {
                      if (!isCurrentPlan) {
                        switchPlan(
                          subscriptionInfo.stripe_subscription_id,
                          price.stripe_price_id
                        );
                      }
                    } else {
                      checkOut(price.stripe_price_id);
                    }
                  }}
                  disabled={loading || isCurrentPlan}
                >
                  {loading
                    ? "Loading..."
                    : !user
                    ? "Subscribe"
                    : isCurrentPlan
                    ? "Current Plan"
                    : "Switch Plan"}
                </Button>
              </Card>
            );
          })}
        </CardsContainer>
      </Container>
    </Section>
  );
};

export default Pricing;
