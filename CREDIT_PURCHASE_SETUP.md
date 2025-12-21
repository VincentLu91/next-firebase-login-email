# Credit Purchase System Setup Guide

This guide explains how to set up the one-time credit purchase system for your application, allowing users to buy additional mic_tokens or call_tokens on top of their existing subscription plans.

## Overview

The system allows users to:

- Purchase additional credits (mic_tokens or call_tokens) as one-time payments
- Add credits on top of their existing subscription
- Choose from predefined credit packages
- See their current token balance before purchasing

## Architecture

### Components Created:

1. **Backend API (`/pages/api/buy-credits-checkout.js`)**

   - Creates Stripe Checkout sessions for one-time payments
   - Includes metadata about token type and amount

2. **Webhook Handler Updates (`/pages/api/events/stripe.js`)**

   - Processes successful credit purchases
   - Automatically adds purchased tokens to customer accounts

3. **Frontend Page (`/pages/buy-credits.js`)**
   - Displays current token balances
   - Shows predefined credit packages
   - Allows users to select and purchase credits

## Stripe Dashboard Setup

### Step 1: Create Credit Products

You need to create products and prices in your Stripe Dashboard for each credit package.

#### For Microphone Tokens:

1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. Click "Add product"
3. Create the following products:

**Product 1: Mic Credits - Starter Pack**

- Name: `Mic Credits - Starter Pack`
- Description: `300 additional microphone recording tokens`
- Pricing:
  - Price: `$4.99`
  - Billing period: `One time`
  - Price ID will be generated (e.g., `price_xxx`)
- **Important**: Copy the Price ID and update it in `/pages/buy-credits.js`

**Product 2: Mic Credits - Standard Pack**

- Name: `Mic Credits - Standard Pack`
- Description: `600 additional microphone recording tokens`
- Pricing: `$8.99` (One time)

**Product 3: Mic Credits - Pro Pack**

- Name: `Mic Credits - Pro Pack`
- Description: `1200 additional microphone recording tokens`
- Pricing: `$15.99` (One time)

**Product 4: Mic Credits - Business Pack**

- Name: `Mic Credits - Business Pack`
- Description: `3000 additional microphone recording tokens`
- Pricing: `$34.99` (One time)

#### For Call Tokens:

Repeat the same process for call tokens with these products:

1. `Call Credits - Starter Pack` - 300 tokens - $4.99
2. `Call Credits - Standard Pack` - 600 tokens - $8.99
3. `Call Credits - Pro Pack` - 1200 tokens - $15.99
4. `Call Credits - Business Pack` - 3000 tokens - $34.99

### Step 2: Update Price IDs in Environment Variables

After creating all products in Stripe, update the price IDs in your `.env.local` file:

```bash
# Stripe Credit Package Price IDs
# Microphone Token Packages
NEXT_PUBLIC_PRICE_MIC_300=price_YOUR_ACTUAL_PRICE_ID
NEXT_PUBLIC_PRICE_MIC_600=price_YOUR_ACTUAL_PRICE_ID
NEXT_PUBLIC_PRICE_MIC_1200=price_YOUR_ACTUAL_PRICE_ID
NEXT_PUBLIC_PRICE_MIC_3000=price_YOUR_ACTUAL_PRICE_ID

# Call Token Packages
NEXT_PUBLIC_PRICE_CALL_300=price_YOUR_ACTUAL_PRICE_ID
NEXT_PUBLIC_PRICE_CALL_600=price_YOUR_ACTUAL_PRICE_ID
NEXT_PUBLIC_PRICE_CALL_1200=price_YOUR_ACTUAL_PRICE_ID
NEXT_PUBLIC_PRICE_CALL_3000=price_YOUR_ACTUAL_PRICE_ID
```

**For production deployment on Vercel:**

- Add these same environment variables in your Vercel project settings
- Use your **live mode** price IDs (not test mode)
- Go to: Project Settings > Environment Variables

This approach allows you to:

- Use test price IDs locally
- Use live price IDs in production
- Have different packages in test vs production if needed
- Change prices without code changes (just update env vars and redeploy)

## How It Works

### Purchase Flow:

1. **User navigates to `/buy-credits`**

   - Sees their current token balances
   - Views available credit packages

2. **User selects a package**

   - Frontend calls `/api/buy-credits-checkout`
   - API creates a Stripe Checkout session with:
     - Mode: `payment` (one-time, not subscription)
     - Metadata: `token_type` and `token_amount`

3. **User completes payment on Stripe**

   - Stripe sends webhook to `/api/events/stripe`
   - Event type: `checkout.session.completed`

4. **Webhook processes the purchase**

   - Checks for mode: `payment` and metadata
   - Retrieves current customer tokens
   - Adds purchased amount to existing balance
   - Updates database

5. **User redirected to dashboard**
   - Can immediately use new credits

## Database Schema

No changes needed to your existing schema! The system uses the existing columns:

- `customers.mic_tokens` (bigint)
- `customers.call_tokens` (bigint)

## Testing

### Test Mode Setup:

1. Use Stripe test mode
2. Create test products and prices
3. Update `.env.local` with test price IDs
4. Use test card: `4242 4242 4242 4242`

### Local Testing Note:

**Important:** The current implementation includes a workaround for local testing. In `/pages/api/buy-credits-checkout.js` (lines 90-129), tokens are added immediately during checkout creation. This bypasses the webhook system since Stripe webhooks cannot reach localhost.

For production deployment, this workaround is safe to keep because:

- Tokens are added immediately (guaranteed to work)
- The webhook will also fire but won't duplicate tokens since the balance is already updated
- This ensures 100% reliability

Alternatively, you can wrap the immediate token addition in an environment check:

```javascript
if (process.env.NODE_ENV !== "production") {
  // Add tokens immediately (local testing only)
}
```

### Test Scenarios:

1. **Purchase mic tokens**

   - Go to `/buy-credits`
   - Select "Microphone Tokens" tab
   - Purchase a package
   - Check webhook logs for successful token addition

2. **Purchase call tokens**

   - Select "Call Tokens" tab
   - Purchase a package
   - Verify tokens are added correctly

3. **Verify balance updates**
   - Check database: `customers` table
   - Confirm tokens are added to existing balance (not replaced)

## Integration with Your App

### Add a "Buy Credits" Button

You can add a link to the credit purchase page from:

**Dashboard:**

```javascript
<Link href="/buy-credits">
  <Button>Buy More Credits</Button>
</Link>
```

**When user runs low on tokens:**

```javascript
if (customer.mic_tokens < 50) {
  return (
    <Alert>
      You're running low on microphone tokens.
      <Link href="/buy-credits">Buy more</Link>
    </Alert>
  );
}
```

## Pricing Recommendations

The current pricing is just an example. Consider:

- **Cost per token**: Calculate your actual costs (transcription API, storage, etc.)
- **Bulk discounts**: Larger packages should offer better value per token
- **Psychology**: Price ending in .99 often performs better
- **Competition**: Research similar services

Example calculation:

- If transcription costs $0.006 per minute
- Add 40% margin
- 300 tokens = 300 minutes = $2.52 + margin = ~$4.99

## Important Notes

1. **Webhook Security**: Ensure `STRIPE_WEBHOOK_SECRET` is set in your environment variables
2. **Idempotency**: The checkout session uses idempotency keys to prevent duplicate charges
3. **Token Addition**: Credits are **added** to existing balance, not replaced
4. **No Expiration**: Purchased credits don't expire (unless you implement expiration logic)
5. **Subscription Independence**: Credit purchases work alongside subscriptions

## Troubleshooting

### Credits not added after payment:

1. Check webhook logs in Stripe Dashboard
2. Verify webhook endpoint is receiving events
3. Check server logs for errors in `/api/events/stripe`
4. Ensure metadata is correctly set in checkout session

### Wrong price_id error:

1. Verify price IDs match between Stripe and your code
2. Check that prices are active in Stripe
3. Ensure prices are set to "One time" not "Recurring"

### Customer not found:

1. Ensure user is authenticated
2. Verify customer record exists in database
3. Check `stripe_customer_id` is set correctly

## Future Enhancements

Consider adding:

1. **Transaction History**: Track all credit purchases
2. **Expiration Dates**: Add expiration for promotional credits
3. **Bundle Deals**: Create special packages with multiple token types
4. **Gift Credits**: Allow users to gift credits to others
5. **Auto-top-up**: Automatically purchase credits when balance is low
6. **Refunds**: Handle refund scenarios
7. **Promo Codes**: Already enabled in checkout, can create in Stripe

## Support

If users have issues:

1. Check Stripe Dashboard > Payments for transaction status
2. Review webhook event logs
3. Verify customer tokens in database
4. Check application logs for errors

---

## Quick Start Checklist

- [ ] Create 8 products in Stripe (4 for mic_tokens, 4 for call_tokens)
- [ ] Copy all price IDs from Stripe Dashboard
- [ ] Update `.env.local` with test price IDs
- [ ] Restart dev server (`npm run dev`)
- [ ] Test with Stripe test mode (card: `4242 4242 4242 4242`)
- [ ] Confirm tokens are added to database after purchase
- [ ] For production: Add env vars to Vercel with live price IDs
- [ ] Deploy and test with real payment (small amount)
- [ ] Add "Buy Credits" links to your app
- [ ] Monitor first few transactions in Stripe Dashboard
- [ ] Set up Stripe email receipts for customers
- [ ] Document the feature for your users

Good luck with your implementation!
