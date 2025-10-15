"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/products/ProductCard";
import { digitalProductsApi, type DigitalProduct } from "@/lib/api/digitalProducts";

export default function MyProductsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [products, setProducts] = useState<DigitalProduct[]>([]);

    const load = async () => {
        try {
            setIsLoading(true);
            const { success, data } = await digitalProductsApi.myProducts();
            if (success) setProducts(data);
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to load products");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this product?")) return;
        try {
            const { success } = await digitalProductsApi.remove(id);
            if (success) {
                toast.success("Deleted");
                load();
            }
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Delete failed");
        }
    };

    return (
        <div className="container mx-auto py-8">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold">My Products</h1>
                <Button onClick={() => router.push("/creator-dashboard/products/new")}>New Product</Button>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-64 w-full" />
                    ))}
                </div>
            ) : products.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <p className="text-muted-foreground">No products yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map((p) => (
                        <div key={p.id} className="space-y-2">
                            <ProductCard product={p} onBuy={() => { }} />
                            <div className="flex gap-2">
                                <Button variant="secondary" className="w-full" onClick={() => router.push(`/creator-dashboard/products/${p.id}/edit`)}>Edit</Button>
                                <Button variant="destructive" className="w-full" onClick={() => handleDelete(p.id)}>Delete</Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
