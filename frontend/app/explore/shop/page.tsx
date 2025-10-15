"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/products/ProductCard";
import { digitalProductsApi, type DigitalProduct } from "@/lib/api/digitalProducts";
import { isAuthenticated } from "@/lib/auth";

export default function ShopPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [products, setProducts] = useState<DigitalProduct[]>([]);
    const [query, setQuery] = useState("");
    const [type, setType] = useState<string>("");
    const [featured, setFeatured] = useState<string>("");

    const loadProducts = async () => {
        try {
            setIsLoading(true);
            const { data, success } = await digitalProductsApi.list({
                search: query || undefined,
                type: type || undefined,
                featured: featured === "true" ? true : featured === "false" ? false : undefined,
            });
            if (success) setProducts(data);
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to load products");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleBuy = async (product: DigitalProduct) => {
        try {
            if (!isAuthenticated()) {
                router.push("/login");
                return;
            }
            const { success } = await digitalProductsApi.purchase(product.id, { paymentMethod: "INTERNAL" });
            if (success) {
                toast.success("Purchase completed");
                loadProducts();
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || "Purchase failed");
        }
    };

    return (
        <div className="container mx-auto py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">Shop</h1>
                <div className="flex gap-2 w-full md:w-auto">
                    <Input
                        placeholder="Search products..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All types</SelectItem>
                            <SelectItem value="EBOOK">Ebook</SelectItem>
                            <SelectItem value="TEMPLATE">Template</SelectItem>
                            <SelectItem value="SOFTWARE">Software</SelectItem>
                            <SelectItem value="AUDIO">Audio</SelectItem>
                            <SelectItem value="VIDEO">Video</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={featured} onValueChange={setFeatured}>
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder="Featured" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All</SelectItem>
                            <SelectItem value="true">Featured</SelectItem>
                            <SelectItem value="false">Non-featured</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={loadProducts}>Filter</Button>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-64 w-full" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map((p) => (
                        <ProductCard key={p.id} product={p} onBuy={handleBuy} />
                    ))}
                    {products.length === 0 && (
                        <div className="text-muted-foreground">No products found.</div>
                    )}
                </div>
            )}
        </div>
    );
}
