import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { CreateMembershipTierDTO, UpdateMembershipTierDTO } from '../types/subscription';

// Create a membership tier for a campaign
export const createMembershipTier = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Verify campaign ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { creatorId: true, type: true },
    });

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    if (campaign.creatorId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized to manage this campaign' });
      return;
    }

    if (campaign.type === 'PROJECT') {
      res.status(400).json({
        success: false,
        message: 'Membership tiers are only available for CREATOR campaigns'
      });
      return;
    }

    const data: CreateMembershipTierDTO = req.body;

    const tier = await prisma.membershipTier.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        interval: data.interval,
        perks: data.perks,
        hasExclusiveContent: data.hasExclusiveContent ?? false,
        hasEarlyAccess: data.hasEarlyAccess ?? false,
        hasPrioritySupport: data.hasPrioritySupport ?? false,
        customPerks: data.customPerks,
        maxSubscribers: data.maxSubscribers,
        position: data.position ?? 0,
        campaignId,
      },
    });

    res.status(201).json({ success: true, data: tier });
  } catch (error) {
    next(error);
  }
};

// Get all tiers for a campaign
export const getCampaignTiers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { campaignId } = req.params;

    const tiers = await prisma.membershipTier.findMany({
      where: {
        campaignId,
        isActive: true,
      },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
      orderBy: { position: 'asc' },
    });

    res.status(200).json({ success: true, data: tiers });
  } catch (error) {
    next(error);
  }
};

// Update a membership tier
export const updateMembershipTier = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tierId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Verify ownership
    const tier = await prisma.membershipTier.findUnique({
      where: { id: tierId },
      include: { campaign: { select: { creatorId: true } } },
    });

    if (!tier) {
      res.status(404).json({ success: false, message: 'Tier not found' });
      return;
    }

    if (tier.campaign.creatorId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    const data: UpdateMembershipTierDTO = req.body;

    const updatedTier = await prisma.membershipTier.update({
      where: { id: tierId },
      data,
    });

    res.status(200).json({ success: true, data: updatedTier });
  } catch (error) {
    next(error);
  }
};

// Delete a membership tier
export const deleteMembershipTier = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tierId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Verify ownership
    const tier = await prisma.membershipTier.findUnique({
      where: { id: tierId },
      include: {
        campaign: { select: { creatorId: true } },
        _count: { select: { subscriptions: true } },
      },
    });

    if (!tier) {
      res.status(404).json({ success: false, message: 'Tier not found' });
      return;
    }

    if (tier.campaign.creatorId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    // Soft delete if there are active subscriptions
    if (tier._count.subscriptions > 0) {
      await prisma.membershipTier.update({
        where: { id: tierId },
        data: { isActive: false },
      });
      res.status(200).json({
        success: true,
        message: 'Tier deactivated. Active subscriptions will continue until cancelled.'
      });
    } else {
      await prisma.membershipTier.delete({
        where: { id: tierId },
      });
      res.status(200).json({ success: true, message: 'Tier deleted' });
    }
  } catch (error) {
    next(error);
  }
};
