import api from "@/lib/api";

export interface DigitalProduct {
    id: string;
    title: string;
    description?: string;
    price: number;
    productType?: string;
    fileUrl?: string;
    fileSize?: string | number | null;
    coverImage?: string;
    previewUrl?: string;
    features?: string[];
    requirements?: string[];
    creatorId: string;
    isActive: boolean;
    isFeatured: boolean;
    salesCount: number;
    revenue: number;
    createdAt: string;
    updatedAt: string;
    creator?: {
        id: string;
        name?: string;
        username?: string;
        avatar?: string;
    };
}

export interface Purchase {
    id: string;
    productId: string;
    userId: string;
    amount: number;
    status: "PENDING" | "COMPLETED" | "FAILED";
    paymentMethod?: string;
    transactionId?: string;
    purchasedAt: string;
    downloadCount?: number;
    lastDownloadAt?: string | null;
    product?: DigitalProduct;
}

export const digitalProductsApi = {
    list: async (params?: { type?: string; featured?: boolean; creatorId?: string; search?: string; }) => {
        const { data } = await api.get("/products", { params: { ...params, featured: params?.featured?.toString() } });
        return data as { success: boolean; data: DigitalProduct[] };
    },
    getById: async (id: string) => {
        const { data } = await api.get(`/products/${id}`);
        return data as { success: boolean; data: DigitalProduct };
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
        return data as { success: boolean; data: Purchase };
    },
    myPurchases: async () => {
        const { data } = await api.get("/purchases/me");
        return data as { success: boolean; data: Purchase[] };
    },
    getDownloadInfo: async (id: string) => {
        const { data } = await api.get(`/products/${id}/download`);
        return data as { success: boolean; data: { fileUrl: string; fileName: string; fileSize?: string; } };
    },
};
