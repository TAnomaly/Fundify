import api, { withAuth } from '../api';
import type {
  MembershipTier,
  Subscription,
  CreateMembershipTierInput,
  UpdateMembershipTierInput,
  CreateSubscriptionInput,
} from '@/types/subscription';
import { ApiResponse } from '@/types/api';

export const subscriptionApi = {
  // Membership Tiers
  createTier: async (campaignId: string, data: CreateMembershipTierInput): Promise<ApiResponse<MembershipTier>> => {
    const response = await api.post(`/memberships/campaigns/${campaignId}/tiers`, data, withAuth());
    return response.data;
  },

  getCampaignTiers: async (campaignId: string): Promise<ApiResponse<MembershipTier[]>> => {
    const response = await api.get(`/memberships/campaigns/${campaignId}/tiers`, withAuth());
    return response.data;
  },

  updateTier: async (tierId: string, data: UpdateMembershipTierInput): Promise<ApiResponse<MembershipTier>> => {
    const response = await api.put(`/memberships/tiers/${tierId}`, data, withAuth());
    return response.data;
  },

  deleteTier: async (tierId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/memberships/tiers/${tierId}`, withAuth());
    return response.data;
  },

  // Subscriptions
  subscribe: async (data: CreateSubscriptionInput): Promise<ApiResponse<Subscription>> => {
    const response = await api.post('/subscriptions', data, withAuth());
    return response.data;
  },

  getMySubscriptions: async (): Promise<ApiResponse<Subscription[]>> => {
    const response = await api.get('/subscriptions/my-subscriptions', withAuth());
    return response.data;
  },

  getMySubscribers: async (): Promise<ApiResponse<{ subscriptions: Subscription[], stats: { totalSubscribers: number, monthlyRevenue: number } }>> => {
    const response = await api.get('/subscriptions/my-subscribers', withAuth());
    return response.data;
  },

  cancelSubscription: async (subscriptionId: string): Promise<ApiResponse<Subscription>> => {
    const response = await api.post(`/subscriptions/${subscriptionId}/cancel`, undefined, withAuth());
    return response.data;
  },

  togglePause: async (subscriptionId: string): Promise<ApiResponse<Subscription>> => {
    const response = await api.post(`/subscriptions/${subscriptionId}/toggle-pause`, undefined, withAuth());
    return response.data;
  },
};
