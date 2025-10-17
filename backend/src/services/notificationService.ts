import { NotificationType } from '@prisma/client';
import prisma from '../utils/prisma';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  imageUrl?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export const createNotification = async ({
  userId,
  type,
  title,
  message,
  link,
  imageUrl,
  actorId,
  metadata,
}: CreateNotificationParams) => {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      link,
      imageUrl,
      actorId,
      metadata,
    },
  });
};

export const markNotificationsRead = async (notificationIds: string[], userId: string) => {
  if (notificationIds.length === 0) {
    return 0;
  }

  const result = await prisma.notification.updateMany({
    where: {
      id: {
        in: notificationIds,
      },
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return result.count;
};
