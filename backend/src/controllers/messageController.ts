import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id?: string;
    userId?: string;
  };
}

// Send a direct message
export const sendMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const senderId = req.user?.id || req.user?.userId;
    if (!senderId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { receiverId, content, type, attachmentUrl, attachmentName, isBroadcast } = req.body;

    if (!content) {
      res.status(400).json({
        success: false,
        message: 'Message content is required',
      });
      return;
    }

    if (!isBroadcast && !receiverId) {
      res.status(400).json({
        success: false,
        message: 'Receiver ID is required for direct messages',
      });
      return;
    }

    // If broadcast, verify sender is a creator
    if (isBroadcast) {
      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { isCreator: true },
      });

      if (!sender?.isCreator) {
        res.status(403).json({
          success: false,
          message: 'Only creators can send broadcast messages',
        });
        return;
      }
    }

    const message = await prisma.message.create({
      data: {
        content,
        type: type || 'TEXT',
        attachmentUrl,
        attachmentName,
        isBroadcast: isBroadcast || false,
        senderId,
        receiverId: isBroadcast ? null : receiverId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        receiver: receiverId
          ? {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            }
          : undefined,
      },
    });

    // If not broadcast, create or update conversation
    if (!isBroadcast && receiverId) {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          OR: [
            { user1Id: senderId, user2Id: receiverId },
            { user1Id: receiverId, user2Id: senderId },
          ],
        },
      });

      if (existingConversation) {
        await prisma.conversation.update({
          where: { id: existingConversation.id },
          data: { lastMessageAt: new Date() },
        });
      } else {
        await prisma.conversation.create({
          data: {
            user1Id: senderId,
            user2Id: receiverId,
            lastMessageAt: new Date(),
          },
        });
      }
    }

    res.status(201).json({
      success: true,
      message: isBroadcast ? 'Broadcast sent successfully' : 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    console.error('Send message error:', error);
    next(error);
  }
};

// Get conversation between two users
export const getConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { otherUserId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
        isBroadcast: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        receiver: {
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
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    next(error);
  }
};

// Get all conversations for a user
export const getUserConversations = async (
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

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        user2: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
    });

    // Get last message and unread count for each conversation
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1;
        const otherUserId = conv.user1Id === userId ? conv.user2Id : conv.user1Id;

        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: otherUserId },
              { senderId: otherUserId, receiverId: userId },
            ],
            isBroadcast: false,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        const unreadCount = await prisma.message.count({
          where: {
            senderId: otherUserId,
            receiverId: userId,
            isRead: false,
          },
        });

        return {
          ...conv,
          otherUser,
          lastMessage,
          unreadCount,
        };
      })
    );

    res.json({
      success: true,
      data: conversationsWithDetails,
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    next(error);
  }
};

// Get broadcast messages from a creator
export const getBroadcastMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { creatorId } = req.params;
    const userId = (req as AuthRequest).user?.id || (req as AuthRequest).user?.userId;

    // Check if user is subscribed to this creator
    if (userId) {
      const subscription = await prisma.subscription.findFirst({
        where: {
          subscriberId: userId,
          creatorId,
          status: 'ACTIVE',
        },
      });

      if (!subscription) {
        res.status(403).json({
          success: false,
          message: 'You must be subscribed to view broadcast messages',
        });
        return;
      }
    }

    const broadcasts = await prisma.message.findMany({
      where: {
        senderId: creatorId,
        isBroadcast: true,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    res.json({
      success: true,
      data: broadcasts,
    });
  } catch (error) {
    console.error('Get broadcast messages error:', error);
    next(error);
  }
};

// Mark message as read
export const markMessageAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { messageId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      res.status(404).json({
        success: false,
        message: 'Message not found',
      });
      return;
    }

    if (message.receiverId !== userId) {
      res.status(403).json({
        success: false,
        message: 'You can only mark your own messages as read',
      });
      return;
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: updatedMessage,
    });
  } catch (error) {
    console.error('Mark message as read error:', error);
    next(error);
  }
};

// Delete message
export const deleteMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { messageId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      res.status(404).json({
        success: false,
        message: 'Message not found',
      });
      return;
    }

    if (message.senderId !== userId) {
      res.status(403).json({
        success: false,
        message: 'You can only delete your own messages',
      });
      return;
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Delete message error:', error);
    next(error);
  }
};

// Get unread message count
export const getUnreadCount = async (
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

    const unreadCount = await prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });

    res.json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    next(error);
  }
};
