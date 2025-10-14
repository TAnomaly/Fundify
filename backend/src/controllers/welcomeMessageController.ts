import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id?: string;
    userId?: string;
  };
}

// Create a welcome message
export const createWelcomeMessage = async (
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

    const { subject, content, tierId, delay, isActive } = req.body;

    if (!subject || !content) {
      res.status(400).json({
        success: false,
        message: 'Subject and content are required',
      });
      return;
    }

    const welcomeMessage = await prisma.welcomeMessage.create({
      data: {
        subject,
        content,
        tierId: tierId || null,
        delay: delay || 0,
        isActive: isActive !== undefined ? isActive : true,
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
        tier: {
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
      message: 'Welcome message created',
      data: welcomeMessage,
    });
  } catch (error) {
    console.error('Create welcome message error:', error);
    next(error);
  }
};

// Get all welcome messages for a creator
export const getWelcomeMessages = async (
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

    const welcomeMessages = await prisma.welcomeMessage.findMany({
      where: {
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
        tier: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: welcomeMessages,
    });
  } catch (error) {
    console.error('Get welcome messages error:', error);
    next(error);
  }
};

// Get a single welcome message
export const getWelcomeMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;

    const welcomeMessage = await prisma.welcomeMessage.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        tier: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });

    if (!welcomeMessage) {
      res.status(404).json({ success: false, message: 'Welcome message not found' });
      return;
    }

    if (welcomeMessage.creatorId !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    res.json({
      success: true,
      data: welcomeMessage,
    });
  } catch (error) {
    console.error('Get welcome message error:', error);
    next(error);
  }
};

// Update a welcome message
export const updateWelcomeMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;

    const welcomeMessage = await prisma.welcomeMessage.findUnique({
      where: { id },
    });

    if (!welcomeMessage) {
      res.status(404).json({ success: false, message: 'Welcome message not found' });
      return;
    }

    if (welcomeMessage.creatorId !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const { subject, content, tierId, delay, isActive } = req.body;

    const updateData: any = {};
    if (subject !== undefined) updateData.subject = subject;
    if (content !== undefined) updateData.content = content;
    if (tierId !== undefined) updateData.tierId = tierId || null;
    if (delay !== undefined) updateData.delay = delay;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.welcomeMessage.update({
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
        tier: {
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
      message: 'Welcome message updated',
      data: updated,
    });
  } catch (error) {
    console.error('Update welcome message error:', error);
    next(error);
  }
};

// Delete a welcome message
export const deleteWelcomeMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;

    const welcomeMessage = await prisma.welcomeMessage.findUnique({
      where: { id },
    });

    if (!welcomeMessage) {
      res.status(404).json({ success: false, message: 'Welcome message not found' });
      return;
    }

    if (welcomeMessage.creatorId !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    await prisma.welcomeMessage.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Welcome message deleted',
    });
  } catch (error) {
    console.error('Delete welcome message error:', error);
    next(error);
  }
};

// Send welcome messages to new subscribers (called by subscription webhook)
export const sendWelcomeMessages = async (
  subscriberId: string,
  creatorId: string,
  tierId: string
): Promise<void> => {
  try {
    // Find applicable welcome messages
    const welcomeMessages = await prisma.welcomeMessage.findMany({
      where: {
        creatorId,
        isActive: true,
        OR: [{ tierId: null }, { tierId }],
      },
    });

    for (const welcomeMsg of welcomeMessages) {
      // Apply delay if specified
      const sendAt = new Date();
      if (welcomeMsg.delay > 0) {
        sendAt.setMinutes(sendAt.getMinutes() + welcomeMsg.delay);
      }

      // For now, send immediately (in production, use a job queue)
      if (welcomeMsg.delay === 0) {
        await prisma.message.create({
          data: {
            content: `**${welcomeMsg.subject}**\n\n${welcomeMsg.content}`,
            type: 'TEXT',
            senderId: creatorId,
            receiverId: subscriberId,
          },
        });

        // Increment sent count
        await prisma.welcomeMessage.update({
          where: { id: welcomeMsg.id },
          data: {
            sentCount: {
              increment: 1,
            },
          },
        });
      }
      // TODO: For delayed messages, create a job in a queue
    }
  } catch (error) {
    console.error('Send welcome messages error:', error);
  }
};

// Trigger welcome message manually for testing
export const triggerWelcomeMessage = async (
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

    const { id } = req.params;
    const { testSubscriberId } = req.body;

    if (!testSubscriberId) {
      res.status(400).json({
        success: false,
        message: 'Test subscriber ID is required',
      });
      return;
    }

    const welcomeMessage = await prisma.welcomeMessage.findUnique({
      where: { id },
    });

    if (!welcomeMessage) {
      res.status(404).json({ success: false, message: 'Welcome message not found' });
      return;
    }

    if (welcomeMessage.creatorId !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    // Send test message
    await prisma.message.create({
      data: {
        content: `[TEST] **${welcomeMessage.subject}**\n\n${welcomeMessage.content}`,
        type: 'TEXT',
        senderId: userId,
        receiverId: testSubscriberId,
      },
    });

    res.json({
      success: true,
      message: 'Test welcome message sent',
    });
  } catch (error) {
    console.error('Trigger welcome message error:', error);
    next(error);
  }
};
