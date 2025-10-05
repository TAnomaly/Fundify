import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { createCommentSchema, updateCommentSchema } from '../utils/validation';
import { ZodError } from 'zod';

export const createComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createCommentSchema.parse(req.body);
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

    // If it's a reply, check if parent comment exists
    if (validatedData.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: validatedData.parentId },
      });

      if (!parentComment) {
        res.status(404).json({
          success: false,
          message: 'Parent comment not found',
        });
        return;
      }

      if (parentComment.campaignId !== validatedData.campaignId) {
        res.status(400).json({
          success: false,
          message: 'Parent comment does not belong to this campaign',
        });
        return;
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: validatedData.content,
        userId,
        campaignId: validatedData.campaignId,
        parentId: validatedData.parentId,
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

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: comment,
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

export const getCommentsByCampaign = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { campaignId } = req.params;

    // Get top-level comments (no parent)
    const comments = await prisma.comment.findMany({
      where: {
        campaignId,
        parentId: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};

export const updateComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const validatedData = updateCommentSchema.parse(req.body);

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
      return;
    }

    if (comment.userId !== userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to update this comment',
      });
      return;
    }

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: {
        content: validatedData.content,
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

    res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      data: updatedComment,
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

export const deleteComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
      return;
    }

    if (comment.userId !== userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this comment',
      });
      return;
    }

    await prisma.comment.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
