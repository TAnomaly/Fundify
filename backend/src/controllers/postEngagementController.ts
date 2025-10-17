import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

// Toggle like on a post
export const toggleLike = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingLike = await tx.postLike.findUnique({
        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
      });

      if (existingLike) {
        await tx.postLike.delete({
          where: {
            userId_postId: {
              userId,
              postId,
            },
          },
        });

        const likeCount = await tx.postLike.count({
          where: { postId },
        });

        await tx.creatorPost.update({
          where: { id: postId },
          data: { likeCount },
        });

        return { liked: false, likeCount };
      }

      await tx.postLike.create({
        data: {
          userId,
          postId,
        },
      });

      const likeCount = await tx.postLike.count({
        where: { postId },
      });

      await tx.creatorPost.update({
        where: { id: postId },
        data: { likeCount },
      });

      return { liked: true, likeCount };
    });

    res.json({
      success: true,
      liked: result.liked,
      message: result.liked ? 'Post liked' : 'Post unliked',
      data: { likeCount: result.likeCount },
    });
  } catch (error) {
    next(error);
  }
};

// Get user's liked posts
export const getUserLikes = async (
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

    const likes = await prisma.postLike.findMany({
      where: { userId },
      select: { postId: true },
    });

    const likedPostIds = likes.map((like) => like.postId);
    res.json({ success: true, data: likedPostIds });
  } catch (error) {
    next(error);
  }
};

// Add comment to a post
export const addComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!content?.trim()) {
      res.status(400).json({ success: false, message: 'Comment content required' });
      return;
    }

    const { comment } = await prisma.$transaction(async (tx) => {
      const createdComment = await tx.postComment.create({
        data: {
          content,
          userId,
          postId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });

      const commentCount = await tx.postComment.count({
        where: { postId },
      });

      await tx.creatorPost.update({
        where: { id: postId },
        data: { commentCount },
      });

      return { comment: createdComment, commentCount };
    });

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
};

// Get comments for a post
export const getComments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { postId } = req.params;

    const comments = await prisma.postComment.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: comments });
  } catch (error) {
    next(error);
  }
};

// Delete comment
export const deleteComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const comment = await prisma.postComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      res.status(404).json({ success: false, message: 'Comment not found' });
      return;
    }

    if (comment.userId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.postComment.delete({
        where: { id: commentId },
      });

      const commentCount = await tx.postComment.count({
        where: { postId: comment.postId },
      });

      await tx.creatorPost.update({
        where: { id: comment.postId },
        data: { commentCount },
      });
    });

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    next(error);
  }
};
