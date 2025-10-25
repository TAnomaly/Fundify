import api, { withAuth } from '../api';
import type {
  CreatorPost,
  CreateCreatorPostInput,
  UpdateCreatorPostInput,
} from '@/types/subscription';
import { ApiResponse } from '@/types/api';

export const creatorPostApi = {
  create: async (data: CreateCreatorPostInput): Promise<ApiResponse<CreatorPost>> => {
    const response = await api.post('/posts', data, withAuth());
    return response.data;
  },

  getMyPosts: async (): Promise<ApiResponse<{ posts: CreatorPost[]; pagination: any; hasSubscription: boolean }>> => {
    const response = await api.get('/posts/my-posts', withAuth());
    return {
      success: response.data.success,
      data: response.data.data,
      message: response.data.message,
    };
  },

  getCreatorPosts: async (creatorId: string, params?: { page?: number, limit?: number }): Promise<ApiResponse<{ posts: CreatorPost[], pagination: any, hasSubscription: boolean }>> => {
    const response = await api.get(`/posts/creator/${creatorId}`, withAuth({ params }));
    return {
      success: response.data.success,
      data: response.data.data,
      message: response.data.message,
    };
  },

  getPost: async (postId: string): Promise<ApiResponse<CreatorPost>> => {
    const response = await api.get(`/posts/${postId}`, withAuth());
    return {
      success: response.data.success,
      data: response.data.data,
      message: response.data.message,
    };
  },

  update: async (postId: string, data: UpdateCreatorPostInput): Promise<ApiResponse<CreatorPost>> => {
    const response = await api.put(`/posts/${postId}`, data, withAuth());
    return response.data;
  },

  delete: async (postId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/posts/${postId}`, withAuth());
    return response.data;
  },
};
