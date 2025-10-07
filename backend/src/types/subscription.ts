import { SubscriptionStatus, SubscriptionInterval } from '@prisma/client';

export interface CreateMembershipTierDTO {
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

export interface UpdateMembershipTierDTO {
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

export interface CreateSubscriptionDTO {
  tierId: string;
  creatorId: string;
}

export interface SubscriptionWithDetails {
  id: string;
  status: SubscriptionStatus;
  startDate: Date;
  nextBillingDate: Date;
  endDate?: Date;
  cancelledAt?: Date;
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
}

export interface CreatorStats {
  totalSubscribers: number;
  activeSubscribers: number;
  monthlyRevenue: number;
  totalRevenue: number;
  tierBreakdown: {
    tierId: string;
    tierName: string;
    subscriberCount: number;
    revenue: number;
  }[];
}
