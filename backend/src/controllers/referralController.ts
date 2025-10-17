import { Response, NextFunction } from 'express';
import { ReferralRewardType } from '@prisma/client';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { generateReferralCode, normalizeReferralCode } from '../services/referralService';

const AUTO_CODE_ATTEMPTS = 5;

const ensureCreator = async (userId: string | undefined) => {
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isCreator: true },
  });

  if (!user || !user.isCreator) {
    return null;
  }

  return user;
};

export const listReferralCodes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    const creator = await ensureCreator(userId);
    if (!creator) {
      res.status(403).json({ success: false, message: 'Only creators can view referral codes' });
      return;
    }

    const referralCodes = await prisma.referralCode.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            usages: true,
          },
        },
      },
    });

    res.json({ success: true, data: referralCodes });
  } catch (error) {
    next(error);
  }
};

export const createReferralCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const creator = await ensureCreator(userId);

    if (!creator) {
      res.status(403).json({ success: false, message: 'Only creators can create referral codes' });
      return;
    }

    const { code, description, usageLimit, expiresAt, rewardType } = req.body as {
      code?: string;
      description?: string;
      usageLimit?: number | string;
      expiresAt?: string;
      rewardType?: ReferralRewardType;
    };

    let normalizedCode = code?.trim() ? normalizeReferralCode(code) : undefined;

    if (normalizedCode && !/^[A-Z0-9\-]{4,20}$/.test(normalizedCode)) {
      res.status(400).json({ success: false, message: 'Referral code must be 4-20 characters using A-Z, 0-9, or hyphen' });
      return;
    }

    if (normalizedCode) {
      const existing = await prisma.referralCode.findUnique({ where: { code: normalizedCode } });
      if (existing) {
        res.status(400).json({ success: false, message: 'Referral code already exists' });
        return;
      }
    }

    if (!normalizedCode) {
      for (let attempt = 0; attempt < AUTO_CODE_ATTEMPTS; attempt += 1) {
        const generated = generateReferralCode();
        const existing = await prisma.referralCode.findUnique({ where: { code: generated } });
        if (!existing) {
          normalizedCode = generated;
          break;
        }
      }

      if (!normalizedCode) {
        res.status(500).json({ success: false, message: 'Unable to generate unique referral code' });
        return;
      }
    }

    const limit = usageLimit !== undefined && usageLimit !== null && usageLimit !== ''
      ? Number(usageLimit)
      : undefined;

    if (limit !== undefined && (Number.isNaN(limit) || limit <= 0)) {
      res.status(400).json({ success: false, message: 'Usage limit must be a positive number' });
      return;
    }

    const expiry = expiresAt ? new Date(expiresAt) : undefined;
    if (expiry && Number.isNaN(expiry.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid expiration date' });
      return;
    }

    const allowedRewards: ReferralRewardType[] = ['SUBSCRIPTION_CREDIT', 'DISCOUNT', 'BONUS_CONTENT', 'NONE'];
    const resolvedReward = rewardType && allowedRewards.includes(rewardType) ? rewardType : 'SUBSCRIPTION_CREDIT';

    const referralCode = await prisma.referralCode.create({
      data: {
        code: normalizedCode,
        description,
        usageLimit: limit,
        expiresAt: expiry,
        rewardType: resolvedReward,
        creatorId: creator.id,
      },
    });

    res.status(201).json({ success: true, data: referralCode });
  } catch (error) {
    next(error);
  }
};

export const updateReferralCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const creator = await ensureCreator(userId);

    if (!creator) {
      res.status(403).json({ success: false, message: 'Only creators can update referral codes' });
      return;
    }

    const { id } = req.params;
    const { description, usageLimit, expiresAt, isActive, rewardType } = req.body as {
      description?: string;
      usageLimit?: number | string | null;
      expiresAt?: string | null;
      isActive?: boolean;
      rewardType?: ReferralRewardType;
    };

    const referral = await prisma.referralCode.findFirst({
      where: {
        id,
        creatorId: creator.id,
      },
    });

    if (!referral) {
      res.status(404).json({ success: false, message: 'Referral code not found' });
      return;
    }

    const limit = usageLimit !== undefined && usageLimit !== null && usageLimit !== ''
      ? Number(usageLimit)
      : undefined;

    if (limit !== undefined && (Number.isNaN(limit) || limit <= 0)) {
      res.status(400).json({ success: false, message: 'Usage limit must be a positive number' });
      return;
    }

    if (limit !== undefined && limit < referral.usageCount) {
      res.status(400).json({ success: false, message: 'Usage limit cannot be less than current usage count' });
      return;
    }

    const expiry = expiresAt === null || expiresAt === '' ? null : expiresAt ? new Date(expiresAt) : undefined;
    if (expiry instanceof Date && Number.isNaN(expiry.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid expiration date' });
      return;
    }

    const allowedRewards: ReferralRewardType[] = ['SUBSCRIPTION_CREDIT', 'DISCOUNT', 'BONUS_CONTENT', 'NONE'];
    const resolvedReward = rewardType && allowedRewards.includes(rewardType) ? rewardType : undefined;

    const updatedReferral = await prisma.referralCode.update({
      where: { id: referral.id },
      data: {
        description: description !== undefined ? description : referral.description,
        usageLimit: usageLimit === null || usageLimit === '' ? null : limit ?? referral.usageLimit,
        expiresAt: expiresAt === null || expiresAt === '' ? null : expiry ?? referral.expiresAt,
        isActive: isActive ?? referral.isActive,
        rewardType: resolvedReward ?? referral.rewardType,
      },
    });

    res.json({ success: true, data: updatedReferral });
  } catch (error) {
    next(error);
  }
};

export const validateReferralCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code } = req.params;

    if (!code || !code.trim()) {
      res.status(400).json({ success: false, message: 'Referral code is required' });
      return;
    }

    const normalizedCode = normalizeReferralCode(code);

    const referral = await prisma.referralCode.findUnique({
      where: { code: normalizedCode },
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

    if (!referral) {
      res.status(404).json({ success: false, message: 'Referral code not found' });
      return;
    }

    if (!referral.isActive) {
      res.status(400).json({ success: false, message: 'Referral code is not active' });
      return;
    }

    if (referral.expiresAt && referral.expiresAt < new Date()) {
      res.status(400).json({ success: false, message: 'Referral code has expired' });
      return;
    }

    if (referral.usageLimit && referral.usageCount >= referral.usageLimit) {
      res.status(400).json({ success: false, message: 'Referral code usage limit reached' });
      return;
    }

    res.json({
      success: true,
      data: {
        code: referral.code,
        description: referral.description,
        rewardType: referral.rewardType,
        usageLimit: referral.usageLimit,
        usageCount: referral.usageCount,
        expiresAt: referral.expiresAt,
        creator: referral.creator,
      },
    });
  } catch (error) {
    next(error);
  }
};
