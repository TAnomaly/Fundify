import axios, { AxiosInstance } from "axios";
import {
  Campaign,
  Donation,
  User,
  ApiResponse,
  PaginatedResponse,
  CampaignFilters,
  DonationFormData,
  CampaignFormData,
  Update,
  Comment,
} from "./types";

// Create axios instance with default config
export const getApiUrl = () => {
  // Try environment variable first, then fallback to hardcoded URLs
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Production fallback URL - UPDATED with working Railway URL
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return "https://perfect-happiness-production.up.railway.app/api";
  }

  return "http://localhost:4000/api";
};

// Get base URL for media files (without /api suffix)
export const getMediaBaseUrl = () => {
  const apiUrl = getApiUrl();
  // Remove /api suffix if present
  return apiUrl.replace(/\/api$/, '');
};

const api: AxiosInstance = axios.create({
  baseURL: getApiUrl(),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access - clean up all auth data
      console.log('401 Unauthorized - clearing tokens and redirecting to login');
      localStorage.removeItem("authToken");
      // Also clear the cookie
      if (typeof document !== 'undefined') {
        document.cookie = "authToken=; path=/; max-age=0";
      }
      // Only redirect if not already on login/register page
      if (typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register')) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Campaign API functions
export const campaignApi = {
  getAll: async (filters?: CampaignFilters): Promise<PaginatedResponse<Campaign>> => {
    const { data } = await api.get("/campaigns", { params: filters });
    return data;
  },

  getById: async (id: string): Promise<ApiResponse<Campaign>> => {
    const { data } = await api.get(`/campaigns/${id}`);
    return data;
  },

  getBySlug: async (slug: string): Promise<ApiResponse<Campaign>> => {
    const { data } = await api.get(`/campaigns/${slug}`);
    return data;
  },

  create: async (campaignData: CampaignFormData): Promise<ApiResponse<Campaign>> => {
    const { goal, imageUrl, endDate, ...rest } = campaignData;
    const { data } = await api.post("/campaigns", {
      ...rest,
      goalAmount: goal,
      coverImage: imageUrl,
      endDate: new Date(endDate).toISOString(),
    });
    return data;
  },

  update: async (id: string, campaignData: Partial<CampaignFormData>): Promise<ApiResponse<Campaign>> => {
    const { data } = await api.put(`/campaigns/${id}`, campaignData);
    return data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const { data } = await api.delete(`/campaigns/${id}`);
    return data;
  },

  getFeatured: async (): Promise<ApiResponse<Campaign[]>> => {
    const { data } = await api.get("/campaigns/featured");
    return data;
  },

  getTrending: async (limit?: number): Promise<ApiResponse<Campaign[]>> => {
    const { data } = await api.get("/campaigns/trending", { params: { limit } });
    return data;
  },

  search: async (query: string): Promise<ApiResponse<Campaign[]>> => {
    const { data } = await api.get("/campaigns/search", { params: { q: query } });
    return data;
  },
};

// Donation API functions
export const donationApi = {
  create: async (campaignId: string, donationData: DonationFormData): Promise<ApiResponse<Donation>> => {
    const { data } = await api.post(`/campaigns/${campaignId}/donations`, donationData);
    return data;
  },

  getById: async (id: string): Promise<ApiResponse<Donation>> => {
    const { data } = await api.get(`/donations/${id}`);
    return data;
  },

  getByCampaign: async (campaignId: string): Promise<ApiResponse<Donation[]>> => {
    const { data } = await api.get(`/campaigns/${campaignId}/donations`);
    return data;
  },

  getByUser: async (userId: string): Promise<ApiResponse<Donation[]>> => {
    const { data } = await api.get(`/users/${userId}/donations`);
    return data;
  },

  getMyDonations: async (): Promise<ApiResponse<Donation[]>> => {
    const { data } = await api.get("/donations/me");
    return data;
  },
};

// User API functions
export const userApi = {
  getMe: async (): Promise<ApiResponse<User>> => {
    const { data } = await api.get("/users/me");
    return data;
  },

  getById: async (id: string): Promise<ApiResponse<User>> => {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },

  update: async (id: string, userData: Partial<User>): Promise<ApiResponse<User>> => {
    const { data } = await api.put(`/users/${id}`, userData);
    return data;
  },

  getCampaigns: async (userId: string): Promise<ApiResponse<Campaign[]>> => {
    const { data } = await api.get(`/users/${userId}/campaigns`);
    return data;
  },

  becomeCreator: async (): Promise<ApiResponse<User>> => {
    const { data } = await api.post("/users/become-creator");
    return data;
  },
};

// Update API functions
export const updateApi = {
  getByCampaign: async (campaignId: string): Promise<ApiResponse<Update[]>> => {
    const { data } = await api.get(`/campaigns/${campaignId}/updates`);
    return data;
  },

  create: async (campaignId: string, updateData: Partial<Update>): Promise<ApiResponse<Update>> => {
    const { data } = await api.post(`/campaigns/${campaignId}/updates`, updateData);
    return data;
  },
};

// Comment API functions
export const commentApi = {
  getByCampaign: async (campaignId: string): Promise<ApiResponse<Comment[]>> => {
    const { data } = await api.get(`/campaigns/${campaignId}/comments`);
    return data;
  },

  create: async (campaignId: string, commentData: Partial<Comment>): Promise<ApiResponse<Comment>> => {
    const { data } = await api.post(`/campaigns/${campaignId}/comments`, commentData);
    return data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const { data } = await api.delete(`/comments/${id}`);
    return data;
  },
};

// Auth API functions
export const authApi = {
  login: async (email: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.success && data.data?.token) {
      localStorage.setItem("authToken", data.data.token);
    }
    return data;
  },

  register: async (userData: {
    email: string;
    password: string;
    username: string;
  }): Promise<ApiResponse<{ token: string; user: User }>> => {
    const { data } = await api.post("/auth/register", {
      email: userData.email,
      password: userData.password,
      name: userData.username,
    });
    if (data.success && data.data?.token) {
      localStorage.setItem("authToken", data.data.token);
    }
    return data;
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem("authToken");
  },

  resetPassword: async (email: string): Promise<ApiResponse<void>> => {
    const { data } = await api.post("/auth/reset-password", { email });
    return data;
  },
};

export default api;
