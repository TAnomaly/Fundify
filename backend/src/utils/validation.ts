import { z } from 'zod';

// Auth Validation Schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  bio: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Campaign Validation Schemas
export const createCampaignSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  description: z.string().min(20, 'Description must be at least 20 characters').max(200),
  story: z.string().min(100, 'Story must be at least 100 characters'),
  type: z.enum(['PROJECT', 'CREATOR', 'CHARITY']).default('PROJECT'),
  category: z.enum([
    'TECHNOLOGY',
    'CREATIVE',
    'COMMUNITY',
    'BUSINESS',
    'EDUCATION',
    'HEALTH',
    'ENVIRONMENT',
    'OTHER',
  ]),
  goalAmount: z.number().positive('Goal amount must be positive'),
  currency: z.string().default('USD'),
  coverImage: z.string().url('Invalid cover image URL'),
  images: z.array(z.string().url()).optional().default([]),
  videoUrl: z.string().url('Invalid video URL').optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const updateCampaignSchema = z.object({
  title: z.string().min(5).max(100).optional(),
  description: z.string().min(20).max(200).optional(),
  story: z.string().min(100).optional(),
  category: z.enum([
    'TECHNOLOGY',
    'CREATIVE',
    'COMMUNITY',
    'BUSINESS',
    'EDUCATION',
    'HEALTH',
    'ENVIRONMENT',
    'OTHER',
  ]).optional(),
  goalAmount: z.number().positive().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  coverImage: z.string().url().optional(),
  images: z.array(z.string().url()).optional(),
  videoUrl: z.string().url().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Reward Validation Schemas
export const createRewardSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  amount: z.number().positive('Amount must be positive'),
  deliveryDate: z.string().datetime().optional(),
  limitedQuantity: z.number().int().positive().optional(),
});

// Donation Validation Schemas
export const createDonationSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
  amount: z.number().positive('Amount must be positive'),
  message: z.string().max(500).optional(),
  anonymous: z.boolean().default(false),
  rewardId: z.string().uuid().optional(),
  paymentMethod: z.string().optional(),
});

// Comment Validation Schemas
export const createCommentSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
  content: z.string().min(1, 'Comment cannot be empty').max(1000),
  parentId: z.string().uuid().optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000),
});

// Campaign Update Validation Schemas
export const createCampaignUpdateSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  content: z.string().min(20, 'Content must be at least 20 characters'),
  images: z.array(z.string().url()).optional().default([]),
});

// Withdrawal Validation Schemas
export const createWithdrawalSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
  amount: z.number().positive('Amount must be positive'),
  bankAccount: z.string().min(1, 'Bank account is required'),
  notes: z.string().optional(),
});

export const updateWithdrawalSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']),
  notes: z.string().optional(),
});

// User Update Validation Schema
export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().optional(),
  avatar: z.string().url().optional(),
});

// Helper function to validate request body
export const validate = (schema: z.ZodSchema) => {
  return (data: unknown) => {
    return schema.parse(data);
  };
};
