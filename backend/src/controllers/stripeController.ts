import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { stripe, STRIPE_CONFIG, getOrCreateStripeCustomer, formatAmountForStripe } from '../config/stripe';
import prisma from '../utils/prisma';

/**
 * Create Stripe Checkout Session for subscription
 * POST /api/stripe/create-checkout-session
 */
export const createCheckoutSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    const userName = (req.user as any)?.name;

    if (!userId || !userEmail) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { tierId, creatorId } = req.body;

    if (!tierId || !creatorId) {
      res.status(400).json({
        success: false,
        message: 'tierId and creatorId are required'
      });
      return;
    }

    // Get tier details
    const tier = await prisma.membershipTier.findUnique({
      where: { id: tierId },
      include: {
        campaign: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        }
      },
    });

    if (!tier) {
      res.status(404).json({ success: false, message: 'Tier not found' });
      return;
    }

    if (!tier.isActive) {
      res.status(400).json({ success: false, message: 'This tier is no longer available' });
      return;
    }

    // Check max subscribers
    if (tier.maxSubscribers && tier.currentSubscribers >= tier.maxSubscribers) {
      res.status(400).json({ success: false, message: 'Tier has reached subscriber limit' });
      return;
    }

    // Check existing active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        subscriberId: userId,
        creatorId,
        status: 'ACTIVE',
      },
    });

    if (existingSubscription) {
      res.status(400).json({
        success: false,
        message: 'You already have an active subscription to this creator'
      });
      return;
    }

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    let stripeCustomerId = user?.stripeCustomerId;

    if (!stripeCustomerId) {
      stripeCustomerId = await getOrCreateStripeCustomer(userId, userEmail, userName);

      // Save customer ID to database
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId },
      });
    }

    // Create Stripe Price (or use existing)
    const priceAmount = formatAmountForStripe(tier.price);
    const interval = tier.interval === 'MONTHLY' ? 'month' : 'year';

    // Create or retrieve product
    let stripeProduct;
    try {
      // Search for existing product for this tier
      const products = await stripe.products.search({
        query: `metadata['tierId']:'${tier.id}'`,
      });

      if (products.data.length > 0) {
        stripeProduct = products.data[0];
      } else {
        // Create new product
        stripeProduct = await stripe.products.create({
          name: `${tier.campaign.creator.name} - ${tier.name}`,
          description: tier.description,
          metadata: {
            tierId: tier.id,
            campaignId: tier.campaignId,
            creatorId: tier.campaign.creatorId,
          },
        });
      }
    } catch (error) {
      console.error('Error creating/finding product:', error);
      throw error;
    }

    // Create or retrieve price
    let stripePrice;
    try {
      const prices = await stripe.prices.list({
        product: stripeProduct.id,
        active: true,
      });

      // Find matching price
      const matchingPrice = prices.data.find(
        p => p.unit_amount === priceAmount && p.recurring?.interval === interval
      );

      if (matchingPrice) {
        stripePrice = matchingPrice;
      } else {
        // Create new price
        stripePrice = await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: priceAmount,
          currency: STRIPE_CONFIG.currency,
          recurring: {
            interval: interval as 'month' | 'year',
          },
          metadata: {
            tierId: tier.id,
          },
        });
      }
    } catch (error) {
      console.error('Error creating/finding price:', error);
      throw error;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1,
        },
      ],
      success_url: STRIPE_CONFIG.successUrl,
      cancel_url: STRIPE_CONFIG.cancelUrl,
      metadata: {
        userId,
        tierId,
        creatorId,
        campaignId: tier.campaignId,
      },
      subscription_data: {
        metadata: {
          userId,
          tierId,
          creatorId,
          campaignId: tier.campaignId,
        },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    next(error);
  }
};

/**
 * Create Stripe Customer Portal session
 * POST /api/stripe/create-portal-session
 */
export const createPortalSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      res.status(400).json({
        success: false,
        message: 'No Stripe customer found. Please create a subscription first.'
      });
      return;
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/subscriptions`,
    });

    res.status(200).json({
      success: true,
      data: {
        url: session.url,
      },
    });
  } catch (error) {
    console.error('Create portal session error:', error);
    next(error);
  }
};

/**
 * Get publishable key for frontend
 * GET /api/stripe/config
 */
export const getStripeConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      data: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      },
    });
  } catch (error) {
    next(error);
  }
};
