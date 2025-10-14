import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id?: string;
    userId?: string;
  };
}

// Create a scheduled post
export const createScheduledPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const {
      title,
      content,
      excerpt,
      coverImage,
      mediaUrls,
      scheduledFor,
      isPublic,
      minimumTierId,
    } = req.body;

    if (!title || !content || !scheduledFor) {
      res.status(400).json({
        success: false,
        message: 'Title, content, and scheduled date are required',
      });
      return;
    }

    const scheduledDate = new Date(scheduledFor);
    if (scheduledDate <= new Date()) {
      res.status(400).json({
        success: false,
        message: 'Scheduled date must be in the future',
      });
      return;
    }

    const scheduledPost = await prisma.scheduledPost.create({
      data: {
        title,
        content,
        excerpt,
        coverImage,
        mediaUrls: mediaUrls || [],
        scheduledFor: scheduledDate,
        isPublic: isPublic !== undefined ? isPublic : true,
        minimumTierId,
        creatorId: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        minimumTier: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Post scheduled successfully',
      data: scheduledPost,
    });
  } catch (error) {
    console.error('Create scheduled post error:', error);
    next(error);
  }
};

// Get all scheduled posts for a creator
export const getScheduledPosts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { published } = req.query;

    const where: any = {
      creatorId: userId,
    };

    if (published !== undefined) {
      where.published = published === 'true';
    }

    const scheduledPosts = await prisma.scheduledPost.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        minimumTier: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
    });

    res.json({
      success: true,
      data: scheduledPosts,
    });
  } catch (error) {
    console.error('Get scheduled posts error:', error);
    next(error);
  }
};

// Get a single scheduled post
export const getScheduledPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;

    const scheduledPost = await prisma.scheduledPost.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        minimumTier: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });

    if (!scheduledPost) {
      res.status(404).json({ success: false, message: 'Scheduled post not found' });
      return;
    }

    if (scheduledPost.creatorId !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    res.json({
      success: true,
      data: scheduledPost,
    });
  } catch (error) {
    console.error('Get scheduled post error:', error);
    next(error);
  }
};

// Update a scheduled post
export const updateScheduledPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;

    const scheduledPost = await prisma.scheduledPost.findUnique({
      where: { id },
    });

    if (!scheduledPost) {
      res.status(404).json({ success: false, message: 'Scheduled post not found' });
      return;
    }

    if (scheduledPost.creatorId !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    if (scheduledPost.published) {
      res.status(400).json({
        success: false,
        message: 'Cannot update a published scheduled post',
      });
      return;
    }

    const {
      title,
      content,
      excerpt,
      coverImage,
      mediaUrls,
      scheduledFor,
      isPublic,
      minimumTierId,
    } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (mediaUrls !== undefined) updateData.mediaUrls = mediaUrls;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (minimumTierId !== undefined) updateData.minimumTierId = minimumTierId;

    if (scheduledFor !== undefined) {
      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate <= new Date()) {
        res.status(400).json({
          success: false,
          message: 'Scheduled date must be in the future',
        });
        return;
      }
      updateData.scheduledFor = scheduledDate;
    }

    const updated = await prisma.scheduledPost.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        minimumTier: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Scheduled post updated',
      data: updated,
    });
  } catch (error) {
    console.error('Update scheduled post error:', error);
    next(error);
  }
};

// Delete a scheduled post
export const deleteScheduledPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;

    const scheduledPost = await prisma.scheduledPost.findUnique({
      where: { id },
    });

    if (!scheduledPost) {
      res.status(404).json({ success: false, message: 'Scheduled post not found' });
      return;
    }

    if (scheduledPost.creatorId !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    await prisma.scheduledPost.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Scheduled post deleted',
    });
  } catch (error) {
    console.error('Delete scheduled post error:', error);
    next(error);
  }
};

// Publish scheduled posts (called by cron job or manually)
export const publishScheduledPosts = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const now = new Date();

    // Find all scheduled posts that are ready to publish
    const readyPosts = await prisma.scheduledPost.findMany({
      where: {
        published: false,
        scheduledFor: {
          lte: now,
        },
      },
    });

    const published = [];

    for (const scheduledPost of readyPosts) {
      try {
        // Create actual post
        const post = await prisma.creatorPost.create({
          data: {
            title: scheduledPost.title,
            content: scheduledPost.content,
            excerpt: scheduledPost.excerpt,
            coverImage: scheduledPost.coverImage,
            mediaUrls: scheduledPost.mediaUrls,
            type: scheduledPost.coverImage ? 'IMAGE' : 'TEXT',
            isPublic: scheduledPost.isPublic,
            minimumTierId: scheduledPost.minimumTierId,
            creatorId: scheduledPost.creatorId,
          },
        });

        // Mark scheduled post as published
        await prisma.scheduledPost.update({
          where: { id: scheduledPost.id },
          data: {
            published: true,
            publishedAt: now,
          },
        });

        published.push(post);
      } catch (error) {
        console.error(`Failed to publish scheduled post ${scheduledPost.id}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Published ${published.length} scheduled posts`,
      data: {
        publishedCount: published.length,
        posts: published,
      },
    });
  } catch (error) {
    console.error('Publish scheduled posts error:', error);
    next(error);
  }
};
