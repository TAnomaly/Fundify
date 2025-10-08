import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

// Initialize Stripe with secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // apiVersion: '2024-12-18.acacia',
  typescript: true,
});

// Stripe configuration constants
export const STRIPE_CONFIG = {
  currency: 'usd',
  successUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
  cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/cancelled`,

  // Webhook settings
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',

  // Product settings
  productName: 'Fundify Membership',
  statementDescriptor: 'FUNDIFY SUB',

  // Fee settings (platform commission)
  platformFeePercent: 0.10, // 10% platform fee

  // Subscription settings
  defaultInterval: 'month' as const,
  trialPeriodDays: 0, // No trial by default

  // Connect settings (for creator payouts)
  connectAccountType: 'express' as const,
};

// Helper to get publishable key (for frontend)
export const getPublishableKey = () => {
  return process.env.STRIPE_PUBLISHABLE_KEY || '';
};

// Helper to verify webhook signature
export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string
): Stripe.Event => {
  if (!STRIPE_CONFIG.webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      STRIPE_CONFIG.webhookSecret
    );
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

// Helper to create or retrieve Stripe customer
export const getOrCreateStripeCustomer = async (
  userId: string,
  email: string,
  name?: string
): Promise<string> => {
  // Check if customer already exists
  const customers = await stripe.customers.list({
    email: email,
    limit: 1,
  });

  if (customers.data.length > 0) {
    return customers.data[0].id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: email,
    name: name,
    metadata: {
      userId: userId,
    },
  });

  return customer.id;
};

// Helper to format amount for Stripe (convert dollars to cents)
export const formatAmountForStripe = (amount: number): number => {
  return Math.round(amount * 100);
};

// Helper to format amount from Stripe (convert cents to dollars)
export const formatAmountFromStripe = (amount: number): number => {
  return amount / 100;
};

export default stripe;
