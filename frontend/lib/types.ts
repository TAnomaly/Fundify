export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  isCreator?: boolean;
  creatorBio?: string;
  socialLinks?: any;
  createdAt: string;
  updatedAt: string;
  followerCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
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
  TECHNOLOGY = "TECHNOLOGY",
  CREATIVE = "CREATIVE",
  COMMUNITY = "COMMUNITY",
  BUSINESS = "BUSINESS",
  EDUCATION = "EDUCATION",
  HEALTH = "HEALTH",
  ENVIRONMENT = "ENVIRONMENT",
  OTHER = "OTHER",
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

export interface NotificationActor {
  id: string;
  name: string;
  avatar?: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  actor?: NotificationActor | null;
}

export type FeedItemType = 'post' | 'article' | 'event';
export type FeedFilter = 'all' | 'posts' | 'articles' | 'events' | 'highlights';
export type FeedSort = 'recent' | 'popular';
export type FeedContentType = 'POST' | 'ARTICLE' | 'EVENT';

export interface FeedItemCreator {
  id: string;
  name: string;
  username?: string | null;
  avatar?: string | null;
  slug?: string;
  followerCount?: number;
}

export interface FeedItemMeta {
  likes?: number;
  comments?: number;
  readTime?: number | null;
  rsvps?: number;
  startTime?: string;
  endTime?: string;
  location?: string | null;
  price?: number | null;
  visibility?: 'public' | 'supporters';
  periodStart?: string | null;
}

export interface FeedItem {
  id: string;
  sourceId: string;
  type: FeedItemType;
  title: string;
  summary?: string | null;
  preview?: string | null;
  coverImage?: string | null;
  publishedAt: string;
  link: string;
  creator: FeedItemCreator;
  popularityScore: number;
  isHighlight: boolean;
  isNew: boolean;
  isSaved: boolean;
  badges: string[];
  meta: FeedItemMeta;
}

export interface FeedBookmark {
  id: string;
  userId: string;
  contentType: FeedContentType;
  contentId: string;
  createdAt: string;
}

export interface FeedRecommendedCreator {
  id: string;
  name: string;
  username?: string | null;
  avatar?: string | null;
  creatorBio?: string | null;
  followerCount: number;
  isFollowed: boolean;
  slug: string;
}

export interface FeedResponseData {
  items: FeedItem[];
  highlights: FeedItem[];
  recommendedContent: FeedItem[];
  recommendedCreators: FeedRecommendedCreator[];
  filters: {
    filter: FeedFilter;
    sort: FeedSort;
    period: number;
  };
  summary: {
    totalItems: number;
    highlightCount: number;
    recommendationsCount: number;
  };
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FeedResponse {
  success: boolean;
  data: FeedResponseData;
  message?: string;
}
