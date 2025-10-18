import { NextFunction, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { FeedContentType } from '@prisma/client';

const VALID_CONTENT_TYPES: FeedContentType[] = ['POST', 'ARTICLE', 'EVENT'];

const normalizeContentType = (value: string | undefined): FeedContentType | null => {
  if (!value) {
    return null;
  }

  const upper = value.toUpperCase();
  return VALID_CONTENT_TYPES.find(type => type === upper) ?? null;
};

export const listBookmarks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const bookmarks = await prisma.feedBookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: bookmarks,
    });
  } catch (error) {
    next(error);
  }
};

export const addBookmark = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { contentType: rawType, contentId } = req.body as {
      contentType?: string;
      contentId?: string;
    };

    const contentType = normalizeContentType(rawType);

    if (!contentType || !contentId) {
      res.status(400).json({
        success: false,
        message: 'Invalid bookmark payload',
      });
      return;
    }

    const bookmark = await prisma.feedBookmark.upsert({
      where: {
        userId_contentType_contentId: {
          userId,
          contentType,
          contentId,
        },
      },
      update: {},
      create: {
        userId,
        contentType,
        contentId,
      },
    });

    res.status(200).json({
      success: true,
      data: bookmark,
    });
  } catch (error) {
    next(error);
  }
};

export const removeBookmark = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { contentType: rawType, contentId } = req.body as {
      contentType?: string;
      contentId?: string;
    } || req.query;

    const contentType = normalizeContentType(
      typeof rawType === 'string' ? rawType : (Array.isArray(rawType) ? rawType[0] : undefined),
    );

    const normalizedContentId = typeof contentId === 'string'
      ? contentId
      : Array.isArray(contentId)
        ? contentId[0]
        : undefined;

    if (!contentType || !normalizedContentId) {
      res.status(400).json({
        success: false,
        message: 'Invalid bookmark payload',
      });
      return;
    }

    await prisma.feedBookmark.deleteMany({
      where: {
        userId,
        contentType,
        contentId: normalizedContentId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Removed from saved items',
      data: {
        contentType,
        contentId: normalizedContentId,
      },
    });
  } catch (error) {
    next(error);
  }
};
