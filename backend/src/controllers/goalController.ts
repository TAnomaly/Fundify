import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id?: string;
    userId?: string;
  };
}

// Create a new goal
export const createGoal = async (
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

    const { title, description, type, targetAmount, rewardDescription, deadline, isPublic } =
      req.body;

    if (!title || !targetAmount) {
      res.status(400).json({
        success: false,
        message: 'Title and target amount are required',
      });
      return;
    }

    const goal = await prisma.goal.create({
      data: {
        title,
        description,
        type: type || 'REVENUE',
        targetAmount: parseFloat(targetAmount),
        rewardDescription,
        deadline: deadline ? new Date(deadline) : null,
        isPublic: isPublic !== undefined ? isPublic : true,
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
      },
    });

    res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      data: goal,
    });
  } catch (error) {
    console.error('Create goal error:', error);
    next(error);
  }
};

// Get all goals for a creator
export const getCreatorGoals = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { creatorId } = req.params;
    const { includeCompleted = 'true', includeInactive = 'false' } = req.query;

    const where: any = {
      creatorId,
    };

    if (includeCompleted === 'false') {
      where.isCompleted = false;
    }

    if (includeInactive === 'false') {
      where.isActive = true;
    }

    const goals = await prisma.goal.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: [{ isCompleted: 'asc' }, { createdAt: 'desc' }],
    });

    // Calculate progress for each goal
    const goalsWithProgress = goals.map((goal) => ({
      ...goal,
      progress: Number(goal.targetAmount) > 0
        ? Math.min(100, Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100))
        : 0,
      remaining: Math.max(0, Number(goal.targetAmount) - Number(goal.currentAmount)),
    }));

    res.json({
      success: true,
      data: goalsWithProgress,
    });
  } catch (error) {
    console.error('Get creator goals error:', error);
    next(error);
  }
};

// Get single goal by ID
export const getGoalById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const goal = await prisma.goal.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
            username: true,
          },
        },
      },
    });

    if (!goal) {
      res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
      return;
    }

    const goalWithProgress = {
      ...goal,
      progress: Number(goal.targetAmount) > 0
        ? Math.min(100, Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100))
        : 0,
      remaining: Math.max(0, Number(goal.targetAmount) - Number(goal.currentAmount)),
    };

    res.json({
      success: true,
      data: goalWithProgress,
    });
  } catch (error) {
    console.error('Get goal error:', error);
    next(error);
  }
};

// Update goal progress (usually called automatically when subscription changes)
export const updateGoalProgress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;
    const { currentAmount } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Verify ownership
    const goal = await prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
      return;
    }

    if (goal.creatorId !== userId) {
      res.status(403).json({
        success: false,
        message: 'You can only update your own goals',
      });
      return;
    }

    const newAmount = parseFloat(currentAmount);
    const isCompleted = newAmount >= Number(goal.targetAmount);

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        currentAmount: newAmount,
        isCompleted,
        completedAt: isCompleted && !goal.isCompleted ? new Date() : goal.completedAt,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    const goalWithProgress = {
      ...updatedGoal,
      progress: Number(updatedGoal.targetAmount) > 0
        ? Math.min(100, Math.round((Number(updatedGoal.currentAmount) / Number(updatedGoal.targetAmount)) * 100))
        : 0,
      remaining: Math.max(0, Number(updatedGoal.targetAmount) - Number(updatedGoal.currentAmount)),
    };

    res.json({
      success: true,
      message: isCompleted && !goal.isCompleted ? 'Congratulations! Goal completed!' : 'Goal progress updated',
      data: goalWithProgress,
    });
  } catch (error) {
    console.error('Update goal progress error:', error);
    next(error);
  }
};

// Update goal details
export const updateGoal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;
    const { title, description, targetAmount, rewardDescription, deadline, isPublic, isActive } =
      req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Verify ownership
    const goal = await prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
      return;
    }

    if (goal.creatorId !== userId) {
      res.status(403).json({
        success: false,
        message: 'You can only update your own goals',
      });
      return;
    }

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(targetAmount && { targetAmount: parseFloat(targetAmount) }),
        ...(rewardDescription !== undefined && { rewardDescription }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(isPublic !== undefined && { isPublic }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Goal updated successfully',
      data: updatedGoal,
    });
  } catch (error) {
    console.error('Update goal error:', error);
    next(error);
  }
};

// Delete goal
export const deleteGoal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Verify ownership
    const goal = await prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
      return;
    }

    if (goal.creatorId !== userId) {
      res.status(403).json({
        success: false,
        message: 'You can only delete your own goals',
      });
      return;
    }

    await prisma.goal.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Goal deleted successfully',
    });
  } catch (error) {
    console.error('Delete goal error:', error);
    next(error);
  }
};
