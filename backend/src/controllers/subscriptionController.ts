import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { CreateSubscriptionDTO } from '../types/subscription';

// Subscribe to a membership tier
export const createSubscription = async (
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

    const { tierId, creatorId }: CreateSubscriptionDTO = req.body;

    // Check if tier exists and is active
    const tier = await prisma.membershipTier.findUnique({
      where: { id: tierId },
      include: { campaign: true },
    });

    if (!tier) {
      res.status(404).json({ success: false, message: 'Membership tier not found' });
      return;
    }

    if (!tier.isActive) {
      res.status(400).json({ success: false, message: 'This tier is no longer available' });
      return;
    }

    // Check max subscribers limit
    if (tier.maxSubscribers && tier.currentSubscribers >= tier.maxSubscribers) {
      res.status(400).json({ success: false, message: 'This tier has reached its subscriber limit' });
      return;
    }

    // Check if already subscribed
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        subscriberId: userId,
        creatorId,
        status: 'ACTIVE',
      },
    });

    if (existingSubscription) {
      res.status(400).json({ success: false, message: 'You are already subscribed to this creator' });
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

    // Create subscription (in production, integrate with Stripe here)
    const subscription = await prisma.subscription.create({
      data: {
        subscriberId: userId,
        creatorId,
        tierId,
        nextBillingDate,
        status: 'ACTIVE',
      },
      include: {
        tier: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            interval: true,
            perks: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Update tier subscriber count
    await prisma.membershipTier.update({
      where: { id: tierId },
      data: { currentSubscribers: { increment: 1 } },
    });

    res.status(201).json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
};

// Get user's subscriptions
export const getMySubscriptions = async (
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

    const subscriptions = await prisma.subscription.findMany({
      where: { subscriberId: userId },
      include: {
        tier: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            interval: true,
            perks: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: subscriptions });
  } catch (error) {
    next(error);
  }
};

// Get creator's subscribers
export const getMySubscribers = async (
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

    const subscriptions = await prisma.subscription.findMany({
      where: {
        creatorId: userId,
        status: 'ACTIVE',
      },
      include: {
        subscriber: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
          },
        },
        tier: {
          select: {
            id: true,
            name: true,
            price: true,
            interval: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate stats
    const totalSubscribers = subscriptions.length;
    const monthlyRevenue = subscriptions.reduce((sum, sub) => {
      const amount = sub.tier.interval === 'MONTHLY' ? sub.tier.price : sub.tier.price / 12;
      return sum + amount;
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        subscriptions,
        stats: {
          totalSubscribers,
          monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Cancel a subscription
export const cancelSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tier: true },
    });

    if (!subscription) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    if (subscription.subscriberId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    if (subscription.status !== 'ACTIVE') {
      res.status(400).json({ success: false, message: 'Subscription is not active' });
      return;
    }

    // Cancel subscription (keep access until end of billing period)
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        endDate: subscription.nextBillingDate,
      },
    });

    // Update tier subscriber count
    await prisma.membershipTier.update({
      where: { id: subscription.tierId },
      data: { currentSubscribers: { decrement: 1 } },
    });

    res.status(200).json({
      success: true,
      data: updatedSubscription,
      message: 'Subscription cancelled. You will have access until ' + subscription.nextBillingDate.toLocaleDateString(),
    });
  } catch (error) {
    next(error);
  }
};

// Pause/Resume a subscription
export const toggleSubscriptionPause = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    if (subscription.subscriberId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    const newStatus = subscription.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: newStatus },
    });

    res.status(200).json({
      success: true,
      data: updatedSubscription,
      message: newStatus === 'PAUSED' ? 'Subscription paused' : 'Subscription resumed',
    });
  } catch (error) {
    next(error);
  }
};
