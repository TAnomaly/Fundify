import api from "@/lib/api";

export interface DigitalProduct {
    id: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    image_url?: string;
    is_digital: boolean;
    download_url?: string;
    created_at: string;
    updated_at: string;
    user_id: string;
    // Frontend için ek field'lar
    title?: string;
    productType?: string;
    fileUrl?: string;
    fileSize?: string | number | null;
    coverImage?: string;
    previewUrl?: string;
    features?: string[];
    requirements?: string[];
    creatorId?: string;
    isActive?: boolean;
    isFeatured?: boolean;
    salesCount?: number;
    revenue?: number;
    createdAt?: string;
    updatedAt?: string;
    creator?: {
        id: string;
        name?: string;
        username?: string;
        avatar?: string;
    };
    _count?: {
        purchases?: number;
    };
}

export interface Purchase {
    id: string;
    productId: string;
    userId: string;
    amount: number;
    currency: string;
    status: "PENDING" | "COMPLETED" | "FAILED";
    paymentMethod?: string;
    transactionId?: string;
    purchasedAt: string;
    downloadCount?: number;
    lastDownloadAt?: string | null;
    stripePaymentIntentId?: string | null;
    stripeCheckoutSessionId?: string | null;
    product?: DigitalProduct;
}

export interface PurchaseInitResponse {
    purchaseId: string;
    status: "PENDING" | "COMPLETED" | "FAILED";
    productId: string;
    amount: number;
    currency: string;
    checkoutUrl?: string;
    stripeSessionId?: string;
    stripePaymentIntentId?: string | null;
}

export interface ProductMeta {
    types: { type: string; count: number }[];
    priceRange: { min: number; max: number };
    stats: {
        totalProducts: number;
        featuredCount: number;
        creatorCount: number;
        totalRevenue: number;
    };
}

export interface ProductCollections {
    featured: DigitalProduct[];
    topSelling: DigitalProduct[];
    newArrivals: DigitalProduct[];
}

export const digitalProductsApi = {
    list: async (params?: {
        type?: string;
        types?: string[];
        featured?: boolean;
        creatorId?: string;
        search?: string;
        minPrice?: number;
        maxPrice?: number;
        sort?: string;
    }) => {
        const query: Record<string, any> = {};

        if (params?.type) query.type = params.type;
        if (params?.types?.length) query.types = params.types.join(",");
        if (params?.featured !== undefined) query.featured = params.featured.toString();
        if (params?.creatorId) query.creatorId = params.creatorId;
        if (params?.search) query.search = params.search;
        if (params?.minPrice !== undefined) query.minPrice = params.minPrice;
        if (params?.maxPrice !== undefined) query.maxPrice = params.maxPrice;
        if (params?.sort) query.sort = params.sort;

        console.log("Making API call to /products with query:", query);
        try {
            const { data } = await api.get("/products", { params: query });
            console.log("API response data:", data);
            // Backend direkt array döndürüyor, frontend format'ına çeviriyoruz
            return { success: true, data: data as DigitalProduct[] };
        } catch (error) {
            console.error("Error in digitalProductsApi.list:", error);
            throw error;
        }
    },
    getById: async (id: string) => {
        const { data } = await api.get(`/products/${id}`);
        // Backend returns product directly, not wrapped in success/data
        return { success: true, data: data as DigitalProduct };
    },
    myProducts: async () => {
        const { data } = await api.get("/products/me");
        return data as { success: boolean; data: DigitalProduct[] };
    },
    create: async (payload: Partial<DigitalProduct>) => {
        const { data } = await api.post("/products", payload);
        return data as { success: boolean; data: DigitalProduct };
    },
    update: async (id: string, payload: Partial<DigitalProduct>) => {
        const { data } = await api.put(`/products/${id}`, payload);
        return data as { success: boolean; data: DigitalProduct };
    },
    remove: async (id: string) => {
        const { data } = await api.delete(`/products/${id}`);
        return data as { success: boolean; message: string };
    },
    purchase: async (id: string, payload: { paymentMethod?: string; transactionId?: string }) => {
        const { data } = await api.post(`/products/${id}/purchase`, payload);
        return data as { success: boolean; data: PurchaseInitResponse };
    },
    myPurchases: async () => {
        const { data } = await api.get("/purchases/me");
        return data as { success: boolean; data: Purchase[] };
    },
    confirmPurchase: async (sessionId: string) => {
        const { data } = await api.post("/purchases/confirm", { sessionId });
        return data as { success: boolean; data: Purchase };
    },
    getDownloadInfo: async (id: string) => {
        const { data } = await api.get(`/products/${id}/download`);
        return data as { success: boolean; data: { fileUrl: string; fileName: string; fileSize?: string; } };
    },
    meta: async () => {
        const { data } = await api.get("/products/meta");
        return data as { success: boolean; data: ProductMeta };
    },
    collections: async () => {
        const { data } = await api.get("/products/collections");
        return data as { success: boolean; data: ProductCollections };
    },
};
