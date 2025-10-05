import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { createDonationSchema } from '../utils/validation';
import { ZodError } from 'zod';

export const createDonation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createDonationSchema.parse(req.body);
    const userId = req.user!.userId;

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: validatedData.campaignId },
    });

    if (!campaign) {
      res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
      return;
    }

    // Check if campaign is active
    if (campaign.status !== 'ACTIVE') {
      res.status(400).json({
        success: false,
        message: 'Campaign is not accepting donations',
      });
      return;
    }

    // If reward is selected, check if it exists and is available
    if (validatedData.rewardId) {
      const reward = await prisma.reward.findUnique({
        where: { id: validatedData.rewardId },
      });

      if (!reward) {
        res.status(404).json({
          success: false,
          message: 'Reward not found',
        });
        return;
      }

      if (reward.campaignId !== validatedData.campaignId) {
        res.status(400).json({
          success: false,
          message: 'Reward does not belong to this campaign',
        });
        return;
      }

      // Check if donation amount meets reward minimum
      if (validatedData.amount < reward.amount) {
        res.status(400).json({
          success: false,
          message: `Minimum donation for this reward is ${reward.amount}`,
        });
        return;
      }

      // Check if reward has limited quantity
      if (reward.limitedQuantity && reward.claimedCount >= reward.limitedQuantity) {
        res.status(400).json({
          success: false,
          message: 'This reward is no longer available',
        });
        return;
      }
    }

    // Create donation and update campaign amount in a transaction
    const donation = await prisma.$transaction(async (tx) => {
      // Create donation
      const newDonation = await tx.donation.create({
        data: {
          amount: validatedData.amount,
          message: validatedData.message,
          anonymous: validatedData.anonymous,
          paymentMethod: validatedData.paymentMethod,
          status: 'COMPLETED', // In production, this would be PENDING until payment is confirmed
          donorId: userId,
          campaignId: validatedData.campaignId,
          rewardId: validatedData.rewardId,
        },
        include: {
          donor: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          campaign: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          reward: true,
        },
      });

      // Update campaign current amount
      await tx.campaign.update({
        where: { id: validatedData.campaignId },
        data: {
          currentAmount: {
            increment: validatedData.amount,
          },
        },
      });

      // If reward was selected, increment claimed count
      if (validatedData.rewardId) {
        await tx.reward.update({
          where: { id: validatedData.rewardId },
          data: {
            claimedCount: {
              increment: 1,
            },
          },
        });
      }

      return newDonation;
    });

    res.status(201).json({
      success: true,
      message: 'Donation created successfully',
      data: donation,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
      return;
    }
    next(error);
  }
};

export const getDonationsByCampaign = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const { page = '1', limit = '10' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [donations, total] = await Promise.all([
      prisma.donation.findMany({
        where: {
          campaignId,
          status: 'COMPLETED',
        },
        skip,
        take,
        include: {
          donor: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          reward: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.donation.count({
        where: {
          campaignId,
          status: 'COMPLETED',
        },
      }),
    ]);

    // Hide donor info for anonymous donations
    const sanitizedDonations = donations.map((donation) => ({
      ...donation,
      donor: donation.anonymous ? null : donation.donor,
    }));

    res.status(200).json({
      success: true,
      data: {
        donations: sanitizedDonations,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyDonations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const donations = await prisma.donation.findMany({
      where: { donorId: userId },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            status: true,
          },
        },
        reward: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      data: donations,
    });
  } catch (error) {
    next(error);
  }
};

export const getDonationById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const donation = await prisma.donation.findUnique({
      where: { id },
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
          },
        },
        reward: true,
      },
    });

    if (!donation) {
      res.status(404).json({
        success: false,
        message: 'Donation not found',
      });
      return;
    }

    // Only the donor can view their own donation details
    if (donation.donorId !== userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to view this donation',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: donation,
    });
  } catch (error) {
    next(error);
  }
};
