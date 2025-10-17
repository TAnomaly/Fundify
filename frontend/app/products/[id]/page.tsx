"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { digitalProductsApi, type DigitalProduct } from "@/lib/api/digitalProducts";
import { isAuthenticated } from "@/lib/auth";
import { getFullMediaUrl } from "@/lib/utils/mediaUrl";
import { motion } from "framer-motion";
import { BlurFade } from "@/components/ui/blur-fade";
import ProductCard from "@/components/products/ProductCard";
import { ArrowRight, Download, Heart, ShoppingCart, CheckCircle, FileText, ShieldCheck } from "lucide-react";

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    
    const [product, setProduct] = useState<DigitalProduct | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<DigitalProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchased, setPurchased] = useState(false);
    const [buying, setBuying] = useState(false);
    const [activeImage, setActiveImage] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            loadProduct();
        }
    }, [id]);

    const loadProduct = async () => {
        try {
            setLoading(true);
            const { success, data } = await digitalProductsApi.getById(id);
            if (success && data) {
                setProduct(data);
                setActiveImage(data.coverImage);
                checkPurchaseStatus(data.id);
                loadRelatedProducts(data.creator.id, data.id);
            } else {
                throw new Error("Product not found");
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to load product");
            router.push("/explore");
        } finally {
            setLoading(false);
        }
    };

    const checkPurchaseStatus = async (productId: string) => {
        if (isAuthenticated()) {
            try {
                const { success: purchasesSuccess, data: purchases } = await digitalProductsApi.myPurchases();
                if (purchasesSuccess) {
                    setPurchased(purchases.some(p => p.productId === productId && p.status === "COMPLETED"));
                }
            } catch (e) { /* Ignore purchase check errors */ }
        }
    };

    const loadRelatedProducts = async (creatorId: string, currentProductId: string) => {
        try {
            const { success, data } = await digitalProductsApi.list({ creatorId });
            if (success && data) {
                setRelatedProducts(data.filter(p => p.id !== currentProductId).slice(0, 3));
            }
        } catch (e) { /* Ignore related products errors */ }
    };

    const handleBuy = async () => {
        if (!isAuthenticated()) {
            router.push(`/login?redirect=/products/${id}`);
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
            if (success && data.fileUrl) {
                toast.success("Your download will begin shortly.");
                window.open(data.fileUrl, "_blank");
            } else {
                 throw new Error(data.message || "Could not get download link.");
            }
        } catch (e: any) {
            toast.error(e.message || "Download failed");
        }
    };

    if (loading) {
        return <ProductPageSkeleton />;
    }

    if (!product) return null;

    const allImages = [product.coverImage, ...(product.additionalImages || [])].filter(Boolean) as string[];

    return (
        <div className="bg-background min-h-screen">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                    {/* Left Column: Image Gallery */}
                    <BlurFade delay={0.25} inView className="lg:sticky top-24">
                        <div className="space-y-4">
                            <div className="bg-muted/50 rounded-2xl overflow-hidden aspect-video relative">
                                {activeImage && (
                                    <Image src={getFullMediaUrl(activeImage)!} alt={product.title} fill className="object-contain"/>
                                )}
                            </div>
                            {allImages.length > 1 && (
                                <div className="grid grid-cols-5 gap-2">
                                    {allImages.map((img, i) => (
                                        <button key={i} onClick={() => setActiveImage(img)} className={`aspect-square rounded-lg overflow-hidden border-2 ${activeImage === img ? 'border-primary' : 'border-transparent'}`}>
                                            <Image src={getFullMediaUrl(img)!} alt={`Thumbnail ${i+1}`} fill className="object-cover"/>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </BlurFade>

                    {/* Right Column: Product Details */}
                    <BlurFade delay={0.5} inView>
                        <div className="space-y-6">
                            <Link href={`/creators/${product.creator.username}`} className="inline-flex items-center gap-3 group">
                                <Image src={getFullMediaUrl(product.creator.avatar)!} alt={product.creator.name} width={40} height={40} className="rounded-full bg-muted"/>
                                <div>
                                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{product.creator.name}</p>
                                    <p className="text-xs text-muted-foreground">View Profile</p>
                                </div>
                            </Link>

                            <div className="space-y-2">
                                <h1 className="text-4xl font-bold tracking-tight">{product.title}</h1>
                                <p className="text-3xl font-bold text-primary">${product.price.toFixed(2)}</p>
                            </div>

                            <div className="prose prose-sm dark:prose-invert text-muted-foreground max-w-none">
                                {product.description}
                            </div>

                            {product.features && product.features.length > 0 && (
                                <div className="space-y-2">
                                    {product.features.map((feature, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                            <CheckCircle className="w-4 h-4 text-green-500"/>
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="pt-6">
                                {purchased ? (
                                    <Button onClick={handleDownload} size="lg" className="w-full">
                                        <Download className="w-5 h-5 mr-2" />
                                        Download Now
                                    </Button>
                                ) : (
                                    <Button onClick={handleBuy} disabled={buying} size="lg" variant="gradient" className="w-full">
                                        {buying ? "Processing..." : <><ShoppingCart className="w-5 h-5 mr-2"/>Buy Now</>}
                                    </Button>
                                )}
                                <p className="text-xs text-muted-foreground text-center mt-2">Secure payment via Stripe.</p>
                            </div>

                            <div className="p-4 rounded-lg bg-muted/50 border border-border/30 text-sm space-y-3">
                                <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary"/><span>{product.fileTypes?.join(', ') || 'Digital files'}</span></div>
                                <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary"/><span>Simple commercial license</span></div>
                            </div>
                        </div>
                    </BlurFade>
                </div>
            </div>

            {/* Related Products */}
            {relatedProducts.length > 0 && (
                <div className="mt-24">
                    <BlurFade delay={0.75} inView>
                        <h2 className="text-2xl font-bold mb-6">More from {product.creator.name}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}
                        </div>
                    </BlurFade>
                </div>
            )}
        </div>
    );
}

const ProductPageSkeleton = () => (
    <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className="space-y-4">
                <Skeleton className="w-full aspect-video rounded-2xl"/>
                <div className="grid grid-cols-5 gap-2">
                    {[...Array(4)].map((_,i) => <Skeleton key={i} className="w-full aspect-square rounded-lg"/>)}
                </div>
            </div>
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full"/>
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-24"/>
                        <Skeleton className="h-3 w-16"/>
                    </div>
                </div>
                <Skeleton className="h-10 w-3/4"/>
                <Skeleton className="h-24 w-full"/>
                <Skeleton className="h-12 w-full"/>
            </div>
        </div>
    </div>
);
