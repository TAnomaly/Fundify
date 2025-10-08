export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';
export type SubscriptionInterval = 'MONTHLY' | 'YEARLY';
export type CampaignType = 'PROJECT' | 'CREATOR' | 'CHARITY';

export interface MembershipTier {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: SubscriptionInterval;
  perks: string[];
  hasExclusiveContent: boolean;
  hasEarlyAccess: boolean;
  hasPrioritySupport: boolean;
  customPerks?: any;
  maxSubscribers?: number;
  currentSubscribers: number;
  position: number;
  isActive: boolean;
  campaignId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    subscriptions: number;
  };
}

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  startDate: string;
  nextBillingDate: string;
  endDate?: string;
  cancelledAt?: string;
  subscriber: {
    id: string;
    name: string;
    avatar?: string;
  };
  tier: {
    id: string;
    name: string;
    description: string;
    price: number;
    interval: SubscriptionInterval;
    perks: string[];
  };
  creator: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateMembershipTierInput {
  name: string;
  description: string;
  price: number;
  interval: SubscriptionInterval;
  perks: string[];
  hasExclusiveContent?: boolean;
  hasEarlyAccess?: boolean;
  hasPrioritySupport?: boolean;
  customPerks?: any;
  maxSubscribers?: number;
  position?: number;
}

export interface UpdateMembershipTierInput {
  name?: string;
  description?: string;
  price?: number;
  perks?: string[];
  hasExclusiveContent?: boolean;
  hasEarlyAccess?: boolean;
  hasPrioritySupport?: boolean;
  customPerks?: any;
  maxSubscribers?: number;
  position?: number;
  isActive?: boolean;
}

export interface CreateSubscriptionInput {
  tierId: string;
  creatorId: string;
}

export interface CreatorPost {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  images: string[];
  videoUrl?: string;
  attachments?: any;
  isPublic: boolean;
  minimumTierId?: string;
  likeCount: number;
  commentCount: number;
  published: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    isCreator: boolean;
  };
  hasAccess?: boolean;
}

export interface CreateCreatorPostInput {
  title: string;
  content: string;
  excerpt?: string;
  images?: string[];
  videoUrl?: string;
  attachments?: any;
  isPublic?: boolean;
  minimumTierId?: string;
  published?: boolean;
  publishedAt?: string;
}

export interface UpdateCreatorPostInput {
  title?: string;
  content?: string;
  excerpt?: string;
  images?: string[];
  videoUrl?: string;
  attachments?: any;
  isPublic?: boolean;
  minimumTierId?: string;
  published?: boolean;
  publishedAt?: string;
}
