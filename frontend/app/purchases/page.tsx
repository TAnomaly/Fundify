"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { digitalProductsApi, type Purchase } from "@/lib/api/digitalProducts";
import { isAuthenticated } from "@/lib/auth";
import { getMediaBaseUrl } from "@/lib/api";

export default function PurchasesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [purchases, setPurchases] = useState<Purchase[]>([]);

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push("/login");
            return;
        }
        loadPurchases();
    }, []);

    const loadPurchases = async () => {
        try {
            setLoading(true);
            const { success, data } = await digitalProductsApi.myPurchases();
            if (success) setPurchases(data);
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to load purchases");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (productId: string) => {
        try {
            const { success, data } = await digitalProductsApi.getDownloadInfo(productId);
            if (success) {
                window.open(data.fileUrl, "_blank");
            }
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Download failed");
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto py-8">
                <h1 className="text-2xl font-bold mb-6">My Purchases</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-48 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-2xl font-bold mb-6">My Purchases</h1>

            {purchases.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <p className="text-muted-foreground">No purchases yet.</p>
                        <Button className="mt-4" onClick={() => router.push("/explore/shop")}>
                            Browse Products
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {purchases.map((purchase) => {
                        const product = purchase.product;
                        if (!product) return null;

                        const mediaBase = getMediaBaseUrl();
                        const imageSrc = product.coverImage
                            ? `${mediaBase}${product.coverImage.startsWith("/") ? "" : "/"}${product.coverImage}`
                            : "/placeholder.png";

                        return (
                            <Card key={purchase.id} className="overflow-hidden">
                                <div className="h-48 overflow-hidden">
                                    <img
                                        src={imageSrc}
                                        alt={product.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <CardHeader>
                                    <CardTitle className="line-clamp-2">{product.title}</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        by {product.creator?.name || "Unknown"}
                                    </p>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <p className="text-lg font-semibold">${purchase.amount.toFixed(2)}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Purchased: {new Date(purchase.purchasedAt).toLocaleDateString()}
                                        </p>
                                        {purchase.downloadCount && (
                                            <p className="text-sm text-muted-foreground">
                                                Downloaded {purchase.downloadCount} times
                                            </p>
                                        )}
                                        <Button
                                            onClick={() => handleDownload(product.id)}
                                            className="w-full"
                                        >
                                            Download
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
