import api from '../api';
import {
  ReferralCode,
  CreateReferralCodeInput,
  UpdateReferralCodeInput,
  ReferralValidationResponse,
} from '@/types/referral';
import { ApiResponse } from '@/types/api';

export const referralApi = {
  list: async (): Promise<ApiResponse<ReferralCode[]>> => {
    const response = await api.get('/referrals');
    return response.data;
  },
  create: async (payload: CreateReferralCodeInput): Promise<ApiResponse<ReferralCode>> => {
    const response = await api.post('/referrals', payload);
    return response.data;
  },
  update: async (id: string, payload: UpdateReferralCodeInput): Promise<ApiResponse<ReferralCode>> => {
    const response = await api.patch(`/referrals/${id}`, payload);
    return response.data;
  },
  validate: async (code: string): Promise<ApiResponse<ReferralValidationResponse>> => {
    const response = await api.get(`/referrals/validate/${encodeURIComponent(code)}`);
    return response.data;
  },
};

export default referralApi;
