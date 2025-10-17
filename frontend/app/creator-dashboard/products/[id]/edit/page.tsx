"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProductForm from "@/components/products/ProductForm";
import { digitalProductsApi, type DigitalProduct } from "@/lib/api/digitalProducts";

export default function EditProductPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState<DigitalProduct | null>(null);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const { success, data } = await digitalProductsApi.getById(id);
                if (success) setProduct(data);
            } catch (e: any) {
                toast.error(e.response?.data?.message || "Failed to load product");
                router.push("/creator-dashboard/products");
            } finally {
                setLoading(false);
            }
        })();
    }, [id, router]);

    if (loading) return <div className="container mx-auto py-8">Loading...</div>;
    if (!product) return null;

    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle>Edit Product</CardTitle>
                </CardHeader>
                <CardContent>
                    <ProductForm initial={product} onSaved={() => router.push(`/creator-dashboard/products`)} />
                </CardContent>
            </Card>
        </div>
    );
}
