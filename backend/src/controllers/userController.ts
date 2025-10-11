import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { updateUserSchema } from '../utils/validation';
import { ZodError } from 'zod';

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatar: true,
        bannerImage: true,
        bio: true,
        role: true,
        isCreator: true,
        creatorBio: true,
        socialLinks: true,
        createdAt: true,
        _count: {
          select: {
            campaigns: true,
            donations: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            campaigns: true,
            donations: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const validatedData = updateUserSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: userId },
      data: validatedData,
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatar: true,
        bannerImage: true,
        bio: true,
        creatorBio: true,
        role: true,
        isCreator: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
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

export const getUserCampaigns = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const campaigns = await prisma.campaign.findMany({
      where: { creatorId: id },
      include: {
        _count: {
          select: {
            donations: true,
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    next(error);
  }
};

export const becomeCreator = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    // Update user to creator
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isCreator: true },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        role: true,
        isCreator: true,
        creatorBio: true,
        socialLinks: true,
        createdAt: true,
      },
    });

    // Check if user already has a CREATOR campaign
    const existingCreatorCampaign = await prisma.campaign.findFirst({
      where: {
        creatorId: userId,
        type: 'CREATOR',
      },
    });

    // If no CREATOR campaign exists, create one automatically
    if (!existingCreatorCampaign) {
      const slug = `${user.name.toLowerCase().replace(/\s+/g, '-')}-creator-${Date.now()}`;

      await prisma.campaign.create({
        data: {
          title: `${user.name}'s Creator Page`,
          slug,
          description: `Support ${user.name} and get exclusive content!`,
          story: `Welcome to my creator page! Subscribe to get exclusive access to my content and support my work.`,
          category: 'OTHER',
          type: 'CREATOR',
          status: 'ACTIVE',
          goalAmount: 0,
          currentAmount: 0,
          coverImage: user.avatar || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
          creatorId: userId,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'You are now a creator! Your creator page has been set up.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Get all creators (public endpoint)
export const getAllCreators = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const creators = await prisma.user.findMany({
      where: {
        isCreator: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        creatorBio: true,
        isCreator: true,
        _count: {
          select: {
            subscribers: true,
            posts: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      data: creators,
    });
  } catch (error) {
    next(error);
  }
};

// Get creator profile by username (public endpoint)
export const getCreatorByUsername = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username } = req.params;

    // Find user by username (name field, case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        name: {
          equals: username.replace(/-/g, ' '),
          mode: 'insensitive',
        },
        isCreator: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        creatorBio: true,
        socialLinks: true,
        isCreator: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Creator not found',
      });
      return;
    }

    // Get or create CREATOR campaign
    let campaign = await prisma.campaign.findFirst({
      where: {
        creatorId: user.id,
        type: 'CREATOR',
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            creatorBio: true,
            socialLinks: true,
          },
        },
      },
    });

    // Auto-create campaign if it doesn't exist
    if (!campaign) {
      const slug = `${user.name.toLowerCase().replace(/\s+/g, '-')}-creator-${Date.now()}`;

      const newCampaign = await prisma.campaign.create({
        data: {
          title: `${user.name}'s Creator Page`,
          slug,
          description: `Support ${user.name} and get exclusive content!`,
          story: `Welcome to my creator page! Subscribe to get exclusive access to my content and support my work.`,
          category: 'OTHER',
          type: 'CREATOR',
          status: 'ACTIVE',
          goalAmount: 0,
          currentAmount: 0,
          coverImage: user.avatar || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
          creatorId: user.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      // Re-fetch with creator included
      campaign = await prisma.campaign.findUnique({
        where: { id: newCampaign.id },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              creatorBio: true,
              socialLinks: true,
            },
          },
        },
      });
    }

    if (!campaign) {
      res.status(500).json({
        success: false,
        message: 'Failed to create campaign',
      });
      return;
    }

    // Get membership tiers
    const tiers = await prisma.membershipTier.findMany({
      where: {
        campaignId: campaign.id,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
      orderBy: {
        price: 'asc',
      },
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        campaign,
        tiers: tiers.map((tier: any) => ({
          ...tier,
          currentSubscribers: tier._count.subscriptions,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
