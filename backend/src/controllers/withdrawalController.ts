import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { createWithdrawalSchema, updateWithdrawalSchema } from '../utils/validation';
import { ZodError } from 'zod';

export const createWithdrawal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createWithdrawalSchema.parse(req.body);
    const userId = req.user!.userId;

    // Check if campaign exists and user is the creator
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

    if (campaign.creatorId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Only campaign creator can request withdrawal',
      });
      return;
    }

    // Check if requested amount is available
    if (validatedData.amount > campaign.currentAmount) {
      res.status(400).json({
        success: false,
        message: 'Insufficient funds in campaign',
      });
      return;
    }

    // Check for pending withdrawals
    const pendingWithdrawal = await prisma.withdrawal.findFirst({
      where: {
        campaignId: validatedData.campaignId,
        status: 'PENDING',
      },
    });

    if (pendingWithdrawal) {
      res.status(400).json({
        success: false,
        message: 'There is already a pending withdrawal for this campaign',
      });
      return;
    }

    const withdrawal = await prisma.withdrawal.create({
      data: {
        amount: validatedData.amount,
        bankAccount: validatedData.bankAccount,
        notes: validatedData.notes,
        userId,
        campaignId: validatedData.campaignId,
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal request created successfully',
      data: withdrawal,
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

export const getWithdrawals = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { status } = req.query;

    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where,
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      data: withdrawals,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllWithdrawals = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      data: withdrawals,
    });
  } catch (error) {
    next(error);
  }
};

export const updateWithdrawal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const validatedData = updateWithdrawalSchema.parse(req.body);

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      include: {
        campaign: true,
      },
    });

    if (!withdrawal) {
      res.status(404).json({
        success: false,
        message: 'Withdrawal not found',
      });
      return;
    }

    // If completing the withdrawal, deduct from campaign amount
    if (validatedData.status === 'COMPLETED' && withdrawal.status !== 'COMPLETED') {
      await prisma.$transaction([
        prisma.withdrawal.update({
          where: { id },
          data: {
            ...validatedData,
            processedAt: new Date(),
          },
        }),
        prisma.campaign.update({
          where: { id: withdrawal.campaignId },
          data: {
            currentAmount: {
              decrement: withdrawal.amount,
            },
          },
        }),
      ]);
    } else {
      await prisma.withdrawal.update({
        where: { id },
        data: {
          ...validatedData,
          processedAt: validatedData.status !== 'PENDING' ? new Date() : undefined,
        },
      });
    }

    const updatedWithdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Withdrawal updated successfully',
      data: updatedWithdrawal,
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
