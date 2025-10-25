export type ReferralRewardType =
  | 'SUBSCRIPTION_CREDIT'
  | 'DISCOUNT'
  | 'BONUS_CONTENT'
  | 'NONE';

export interface ReferralCode {
  id: string;
  code: string;
  description?: string | null;
  rewardType: ReferralRewardType;
  usageLimit?: number | null;
  usageCount: number;
  expiresAt?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    usages: number;
  };
}

export interface CreateReferralCodeInput {
  code?: string;
  description?: string;
  usageLimit?: number | null;
  expiresAt?: string | null;
  rewardType?: ReferralRewardType;
}

export interface UpdateReferralCodeInput {
  description?: string;
  usageLimit?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
  rewardType?: ReferralRewardType;
}

export interface ReferralValidationResponse {
  code: string;
  description?: string | null;
  rewardType: ReferralRewardType;
  usageLimit?: number | null;
  usageCount: number;
  expiresAt?: string | null;
  creator: {
    id: string;
    name: string;
    avatar?: string | null;
  };
}
