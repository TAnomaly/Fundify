import { Request, Response } from 'express';
import Stripe from 'stripe';
import { verifyWebhookSignature } from '../config/stripe';
import prisma from '../utils/prisma';

/**
 * Handle Stripe webhooks
 * POST /api/webhooks/stripe
 *
 * IMPORTANT: This endpoint must use raw body parser, not JSON parser
 */
export const handleStripeWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    console.error('No stripe-signature header found');
    res.status(400).send('No stripe-signature header');
    return;
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = verifyWebhookSignature(req.body, signature);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return;
  }

  console.log(`Received webhook: ${event.type}`);

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

/**
 * Handle successful checkout session
 * Creates subscription record in database
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.completed:', session.id);

  const { userId, tierId, creatorId } = session.metadata || {};

  if (!userId || !tierId || !creatorId) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  // Get subscription ID from Stripe
  const stripeSubscriptionId = session.subscription as string;

  if (!stripeSubscriptionId) {
    console.error('No subscription ID in checkout session:', session.id);
    return;
  }

  // Check if subscription already exists
  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      stripeSubscriptionId,
    },
  });

  if (existingSubscription) {
    console.log('Subscription already exists:', stripeSubscriptionId);
    return;
  }

  // Get tier details for billing calculation
  const tier = await prisma.membershipTier.findUnique({
    where: { id: tierId },
  });

  if (!tier) {
    console.error('Tier not found:', tierId);
    return;
  }

  // Calculate next billing date
  const startDate = new Date();
  const nextBillingDate = new Date(startDate);
  if (tier.interval === 'MONTHLY') {
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  } else {
    nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
  }

  // Create subscription in database
  const subscription = await prisma.subscription.create({
    data: {
      subscriberId: userId,
      creatorId,
      tierId,
      status: 'ACTIVE',
      startDate,
      nextBillingDate,
      stripeSubscriptionId,
      stripeCustomerId: session.customer as string,
    },
  });

  // Update tier subscriber count
  await prisma.membershipTier.update({
    where: { id: tierId },
    data: {
      currentSubscribers: { increment: 1 },
    },
  });

  console.log('Subscription created:', subscription.id);

  // TODO: Send welcome email to subscriber
  // TODO: Notify creator of new subscriber
}

/**
 * Handle subscription update
 */
async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  console.log('Processing customer.subscription.updated:', stripeSubscription.id);

  const subscription = await prisma.subscription.findFirst({
    where: {
      stripeSubscriptionId: stripeSubscription.id,
    },
  });

  if (!subscription) {
    console.log('Subscription not found in database:', stripeSubscription.id);
    return;
  }

  // Map Stripe status to our status
  let status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED' = 'ACTIVE';
  if (stripeSubscription.status === 'canceled') {
    status = 'CANCELLED';
  } else if (stripeSubscription.status === 'paused') {
    status = 'PAUSED';
  } else if (stripeSubscription.status === 'past_due' || stripeSubscription.status === 'unpaid') {
    status = 'EXPIRED';
  }

  // Calculate next billing date
  const nextBillingDate = (stripeSubscription as any).current_period_end
    ? new Date((stripeSubscription as any).current_period_end * 1000)
    : subscription.nextBillingDate;

  // Update subscription
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status,
      nextBillingDate,
    },
  });

  console.log(`Subscription updated: ${subscription.id} -> ${status}`);
}

/**
 * Handle subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  console.log('Processing customer.subscription.deleted:', stripeSubscription.id);

  const subscription = await prisma.subscription.findFirst({
    where: {
      stripeSubscriptionId: stripeSubscription.id,
    },
  });

  if (!subscription) {
    console.log('Subscription not found in database:', stripeSubscription.id);
    return;
  }

  // Update subscription status
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'CANCELLED',
      endDate: new Date(),
      cancelledAt: new Date(),
    },
  });

  // Decrement tier subscriber count
  await prisma.membershipTier.update({
    where: { id: subscription.tierId },
    data: {
      currentSubscribers: { decrement: 1 },
    },
  });

  console.log('Subscription cancelled:', subscription.id);

  // TODO: Send cancellation email
}

/**
 * Handle successful payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Processing invoice.payment_succeeded:', invoice.id);

  const stripeSubscriptionId = (invoice as any).subscription as string;

  if (!stripeSubscriptionId) {
    console.log('No subscription ID in invoice');
    return;
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      stripeSubscriptionId,
    },
    include: {
      tier: true,
    },
  });

  if (!subscription) {
    console.log('Subscription not found for invoice:', invoice.id);
    return;
  }

  // Update next billing date
  const nextBillingDate = new Date();
  if (subscription.tier.interval === 'MONTHLY') {
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  } else {
    nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      nextBillingDate,
      status: 'ACTIVE', // Ensure status is active after successful payment
    },
  });

  console.log('Payment processed for subscription:', subscription.id);

  // TODO: Send receipt email
}

/**
 * Handle failed payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing invoice.payment_failed:', invoice.id);

  const stripeSubscriptionId = (invoice as any).subscription as string;

  if (!stripeSubscriptionId) {
    console.log('No subscription ID in invoice');
    return;
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      stripeSubscriptionId,
    },
  });

  if (!subscription) {
    console.log('Subscription not found for invoice:', invoice.id);
    return;
  }

  // Optionally mark subscription as past due or handle retry logic
  // For now, just log it - Stripe will retry automatically
  console.log('Payment failed for subscription:', subscription.id);

  // TODO: Send payment failure email
  // TODO: Implement retry logic or grace period
}
