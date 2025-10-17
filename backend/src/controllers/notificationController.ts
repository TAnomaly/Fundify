import { Response, NextFunction } from 'express';
import { NotificationType } from '@prisma/client';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { markNotificationsRead } from '../services/notificationService';

const DEFAULT_LIMIT = 20;

export const listNotifications = async (
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

    const { cursor, limit = DEFAULT_LIMIT.toString(), unreadOnly } = req.query;
    const take = Math.min(Number(limit) || DEFAULT_LIMIT, 50);

    const where: Record<string, unknown> = {
      userId,
    };

    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: take + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: String(cursor) } : undefined,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    const hasMore = notifications.length > take;
    const items = hasMore ? notifications.slice(0, take) : notifications;

    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    res.json({
      success: true,
      data: {
        items,
        unreadCount,
        nextCursor: hasMore ? notifications[notifications.length - 1].id : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (
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

    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    if (!notification.isRead) {
      await prisma.notification.update({
        where: { id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsRead = async (
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

    const updatedCount = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ success: true, data: { updated: updatedCount.count } });
  } catch (error) {
    next(error);
  }
};

// Helper to seed notifications (optional) - keep for internal tooling
export const createNotificationForUser = async (
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

    const { type, title, message, link, imageUrl } = req.body as {
      type?: NotificationType;
      title?: string;
      message?: string;
      link?: string;
      imageUrl?: string;
    };

    if (!type || !title || !message) {
      res.status(400).json({ success: false, message: 'type, title and message are required' });
      return;
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
        imageUrl,
      },
    });

    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};
