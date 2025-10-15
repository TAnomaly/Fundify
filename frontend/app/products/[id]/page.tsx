"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { digitalProductsApi, type DigitalProduct } from "@/lib/api/digitalProducts";
import { isAuthenticated } from "@/lib/auth";
import { getMediaBaseUrl } from "@/lib/api";

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState<DigitalProduct | null>(null);
    const [purchased, setPurchased] = useState(false);
    const [buying, setBuying] = useState(false);

    useEffect(() => {
        loadProduct();
    }, [id]);

    const loadProduct = async () => {
        try {
            setLoading(true);
            const { success, data } = await digitalProductsApi.getById(id);
            if (success) {
                setProduct(data);
                // Check if user already purchased
                if (isAuthenticated()) {
                    try {
                        const { success: purchasesSuccess, data: purchases } = await digitalProductsApi.myPurchases();
                        if (purchasesSuccess) {
                            const hasPurchased = purchases.some(p => p.productId === id && p.status === "COMPLETED");
                            setPurchased(hasPurchased);
                        }
                    } catch (e) {
                        // Ignore purchase check errors
                    }
                }
            }
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to load product");
            router.push("/explore/shop");
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = async () => {
        if (!isAuthenticated()) {
            router.push("/login");
            return;
        }
        try {
            setBuying(true);
            const { success } = await digitalProductsApi.purchase(id, { paymentMethod: "INTERNAL" });
            if (success) {
                toast.success("Purchase completed!");
                setPurchased(true);
            }
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Purchase failed");
        } finally {
            setBuying(false);
        }
    };

    const handleDownload = async () => {
        try {
            const { success, data } = await digitalProductsApi.getDownloadInfo(id);
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Skeleton className="h-96 w-full" />
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-12 w-32" />
                    </div>
                </div>
            </div>
        );
    }

    if (!product) return null;

    const mediaBase = getMediaBaseUrl();
    const imageSrc = product.coverImage
        ? `${mediaBase}${product.coverImage.startsWith("/") ? "" : "/"}${product.coverImage}`
        : "/placeholder.png";

    return (
        <div className="container mx-auto py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Product Image */}
                <div>
                    <img
                        src={imageSrc}
                        alt={product.title}
                        className="w-full h-96 object-cover rounded-lg"
                    />
                </div>

                {/* Product Info */}
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <h1 className="text-3xl font-bold">{product.title}</h1>
                            {product.isFeatured && <Badge>Featured</Badge>}
                        </div>
                        <p className="text-2xl font-semibold text-primary">${product.price.toFixed(2)}</p>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-2">Description</h3>
                        <p className="text-muted-foreground">{product.description}</p>
                    </div>

                    {product.features && product.features.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Features</h3>
                            <ul className="list-disc list-inside space-y-1">
                                {product.features.map((feature, i) => (
                                    <li key={i} className="text-muted-foreground">{feature}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {product.requirements && product.requirements.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Requirements</h3>
                            <ul className="list-disc list-inside space-y-1">
                                {product.requirements.map((req, i) => (
                                    <li key={i} className="text-muted-foreground">{req}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex gap-4">
                        {purchased ? (
                            <Button onClick={handleDownload} className="flex-1">
                                Download
                            </Button>
                        ) : (
                            <Button onClick={handleBuy} disabled={buying} className="flex-1">
                                {buying ? "Processing..." : "Buy Now"}
                            </Button>
                        )}
                    </div>

                    <div className="text-sm text-muted-foreground">
                        <p>Created by {product.creator?.name || "Unknown"}</p>
                        <p>{product.salesCount} sales</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
