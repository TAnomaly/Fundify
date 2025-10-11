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

    // Check if already liked
    const existingLike = await prisma.postLike.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.postLike.delete({
        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
      });

      // Decrement like count
      const updatedPost = await prisma.creatorPost.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true },
      });

      res.json({ 
        success: true, 
        liked: false, 
        message: 'Post unliked',
        data: { likeCount: updatedPost.likeCount }
      });
    } else {
      // Like
      await prisma.postLike.create({
        data: {
          userId,
          postId,
        },
      });

      // Increment like count
      const updatedPost = await prisma.creatorPost.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      });

      res.json({ 
        success: true, 
        liked: true, 
        message: 'Post liked',
        data: { likeCount: updatedPost.likeCount }
      });
    }
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

    const comment = await prisma.postComment.create({
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

    // Increment comment count
    await prisma.creatorPost.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
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

    await prisma.postComment.delete({
      where: { id: commentId },
    });

    // Decrement comment count
    await prisma.creatorPost.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    });

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    next(error);
  }
};

