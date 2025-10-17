import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

const FOLLOW_PAGE_LIMIT = 50;

const getQueryValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0];
  }

  return undefined;
};

const sanitizePagination = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, FOLLOW_PAGE_LIMIT);
};

export const followUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const followerId = req.user?.id || req.user?.userId;
    const { userId: followingId } = req.params;

    if (!followerId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!followingId) {
      res.status(400).json({ success: false, message: 'Missing user to follow' });
      return;
    }

    if (followerId === followingId) {
      res.status(400).json({ success: false, message: 'You cannot follow yourself' });
      return;
    }

    const target = await prisma.user.findUnique({
      where: { id: followingId },
      select: { id: true, isCreator: true, name: true },
    });

    if (!target) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Optional: limit following to creators, but allow admins/test to follow anyone
    if (!target.isCreator) {
      res.status(400).json({ success: false, message: 'Only creator accounts can be followed at this time' });
      return;
    }

    await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    }).catch(async (error) => {
      // Ignore duplicate follow requests to keep endpoint idempotent
      if ((error as any)?.code === 'P2002') {
        return;
      }
      throw error;
    });

    const followerCount = await prisma.follow.count({
      where: { followingId },
    });

    res.status(200).json({
      success: true,
      message: `You are now following ${target.name}`,
      data: {
        followerCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const unfollowUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const followerId = req.user?.id || req.user?.userId;
    const { userId: followingId } = req.params;

    if (!followerId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!followingId) {
      res.status(400).json({ success: false, message: 'Missing user to unfollow' });
      return;
    }

    await prisma.follow.deleteMany({
      where: {
        followerId,
        followingId,
      },
    });

    const followerCount = await prisma.follow.count({
      where: { followingId },
    });

    res.status(200).json({
      success: true,
      message: 'Unfollowed successfully',
      data: {
        followerCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getFollowers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const page = sanitizePagination(getQueryValue(req.query.page), 1);
    const limit = sanitizePagination(getQueryValue(req.query.limit), 20);
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              bio: true,
            },
          },
        },
      }),
      prisma.follow.count({ where: { followingId: userId } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        followers: rows.map(row => row.follower),
        pagination: {
          page,
          limit,
          total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getFollowing = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const page = sanitizePagination(getQueryValue(req.query.page), 1);
    const limit = sanitizePagination(getQueryValue(req.query.limit), 20);
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          following: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              bio: true,
              creatorBio: true,
              isCreator: true,
            },
          },
        },
      }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        following: rows.map(row => row.following),
        pagination: {
          page,
          limit,
          total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
