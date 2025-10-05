export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  title: string;
  slug: string;
  description: string;
  story: string;
  goal: number;
  currentAmount: number;
  category: CampaignCategory;
  imageUrl: string;
  videoUrl?: string;
  creatorId: string;
  creator?: User;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  featured?: boolean;
  tags?: string[];
  backers?: number;
}

export enum CampaignCategory {
  TECHNOLOGY = "technology",
  ARTS = "arts",
  MUSIC = "music",
  FILM = "film",
  GAMES = "games",
  DESIGN = "design",
  FOOD = "food",
  FASHION = "fashion",
  PUBLISHING = "publishing",
  EDUCATION = "education",
  HEALTH = "health",
  ENVIRONMENT = "environment",
  COMMUNITY = "community",
  OTHER = "other",
}

export enum CampaignStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  SUSPENDED = "suspended",
}

export interface Donation {
  id: string;
  campaignId: string;
  campaign?: Campaign;
  userId?: string;
  user?: User;
  amount: number;
  message?: string;
  anonymous: boolean;
  status: DonationStatus;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export enum DonationStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export enum PaymentMethod {
  CREDIT_CARD = "credit_card",
  DEBIT_CARD = "debit_card",
  PAYPAL = "paypal",
  BANK_TRANSFER = "bank_transfer",
  CRYPTO = "crypto",
}

export interface Update {
  id: string;
  campaignId: string;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  campaignId: string;
  userId: string;
  user?: User;
  content: string;
  parentId?: string;
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Reward {
  id: string;
  campaignId: string;
  title: string;
  description: string;
  amount: number;
  limitedQuantity?: number;
  remainingQuantity?: number;
  estimatedDelivery?: string;
  shippingIncluded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

export interface CampaignFilters {
  category?: CampaignCategory;
  status?: CampaignStatus;
  search?: string;
  sortBy?: "newest" | "popular" | "ending" | "funded";
  page?: number;
  pageSize?: number;
}

export interface DonationFormData {
  amount: number;
  message?: string;
  anonymous: boolean;
  paymentMethod: PaymentMethod;
}

export interface CampaignFormData {
  title: string;
  description: string;
  story: string;
  goal: number;
  category: CampaignCategory;
  imageUrl: string;
  videoUrl?: string;
  endDate: string;
  tags?: string[];
}
