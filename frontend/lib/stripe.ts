import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

// Initialize Stripe
export const getStripe = () => {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined');
      return null;
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

// Create checkout session and redirect
export const redirectToCheckout = async (tierId: string, creatorId: string) => {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      throw new Error('Stripe failed to initialize');
    }

    // Call backend to create checkout session
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/stripe/create-checkout-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ tierId, creatorId }),
      }
    );

    const data = await response.json();

    if (!data.success || !data.data?.sessionId) {
      throw new Error(data.message || 'Failed to create checkout session');
    }

    // Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({
      sessionId: data.data.sessionId,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Checkout error:', error);
    throw error;
  }
};

// Open Stripe Customer Portal
export const openCustomerPortal = async () => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/stripe/create-portal-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      }
    );

    const data = await response.json();

    if (!data.success || !data.data?.url) {
      throw new Error(data.message || 'Failed to create portal session');
    }

    // Redirect to Stripe Customer Portal
    window.location.href = data.data.url;
  } catch (error) {
    console.error('Portal error:', error);
    throw error;
  }
};
