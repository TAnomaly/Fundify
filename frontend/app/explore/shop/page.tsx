"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/products/ProductCard";
import ProductCollections from "@/components/products/ProductCollections";
import {
    digitalProductsApi,
    type DigitalProduct,
    type ProductCollections as CollectionsResponse,
    type ProductMeta,
} from "@/lib/api/digitalProducts";
import { isAuthenticated } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";

const PRODUCT_TYPE_LABELS: Record<string, string> = {
    EBOOK: "E-book",
    COURSE: "Course",
    TEMPLATE: "Template",
    AUDIO: "Audio",
    VIDEO: "Video",
    SOFTWARE: "Software",
    ASSET: "Asset",
    OTHER: "Digital",
};

function useDebounce<T>(value: T, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}

const parseNumberInput = (value: string): number | undefined => {
    if (!value || !value.trim()) {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

export default function ShopPage() {
    const router = useRouter();
    const [products, setProducts] = useState<DigitalProduct[]>([]);
    const [meta, setMeta] = useState<ProductMeta | null>(null);
    const [collections, setCollections] = useState<CollectionsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMetaLoading, setIsMetaLoading] = useState(true);
    const [isCollectionsLoading, setIsCollectionsLoading] = useState(true);

    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 300);

    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [featuredFilter, setFeaturedFilter] = useState<"all" | "true" | "false">("all");
    const [sort, setSort] = useState("popular");
    const [priceMin, setPriceMin] = useState<string>("");
    const [priceMax, setPriceMax] = useState<string>("");
    const [priceInitialized, setPriceInitialized] = useState(false);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                setIsMetaLoading(true);
                const response = await digitalProductsApi.meta();
                if (response.success) {
                    setMeta(response.data);
                    if (!priceInitialized) {
                        const { min, max } = response.data.priceRange;
                        if (min !== undefined && min !== null) setPriceMin(String(min));
                        if (max !== undefined && max !== null) setPriceMax(String(max));
                        setPriceInitialized(true);
                    }
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load shop insights");
            } finally {
                setIsMetaLoading(false);
            }
        };

        const fetchCollections = async () => {
            try {
                setIsCollectionsLoading(true);
                const response = await digitalProductsApi.collections();
                if (response.success) {
                    setCollections(response.data);
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load curated collections");
            } finally {
                setIsCollectionsLoading(false);
            }
        };

        fetchMeta();
        fetchCollections();
    }, [priceInitialized]);

    const loadProducts = useCallback(async () => {
        try {
            setIsLoading(true);

            const params: Parameters<typeof digitalProductsApi.list>[0] = {
                sort,
            };

            if (debouncedQuery.trim()) {
                params.search = debouncedQuery.trim();
            }
            if (selectedTypes.length > 0) {
                params.types = selectedTypes;
            }
            if (featuredFilter === "true") {
                params.featured = true;
            } else if (featuredFilter === "false") {
                params.featured = false;
            }

            const minPriceValue = parseNumberInput(priceMin);
            const maxPriceValue = parseNumberInput(priceMax);

            if (minPriceValue !== undefined) {
                params.minPrice = minPriceValue;
            }
            if (maxPriceValue !== undefined) {
                params.maxPrice = maxPriceValue;
            }

            const { success, data } = await digitalProductsApi.list(params);
            if (success) {
                setProducts(data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load products");
        } finally {
            setIsLoading(false);
        }
    }, [debouncedQuery, featuredFilter, priceMax, priceMin, selectedTypes, sort]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const handleBuy = useCallback(async (product: DigitalProduct) => {
        try {
            if (!isAuthenticated()) {
                router.push("/login");
                return;
            }
            const { success, data } = await digitalProductsApi.purchase(product.id, { paymentMethod: "STRIPE" });
            if (success && data) {
                if (data.checkoutUrl) {
                    window.location.href = data.checkoutUrl;
                    return;
                }

                if (data.status === "COMPLETED") {
                    toast.success("Purchase completed");
                    await loadProducts();
                } else {
                    toast.success("Checkout initialized. Complete payment to finish your purchase.");
                }
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || "Purchase failed");
        }
    }, [loadProducts, router]);

    const toggleType = (type: string) => {
        setSelectedTypes((prev) =>
            prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]
        );
    };

    const resetFilters = () => {
        setSelectedTypes([]);
        setFeaturedFilter("all");
        setSort("popular");
        setQuery("");
        if (meta) {
            const { min, max } = meta.priceRange;
            setPriceMin(min !== undefined && min !== null ? String(min) : "");
            setPriceMax(max !== undefined && max !== null ? String(max) : "");
        } else {
            setPriceMin("");
            setPriceMax("");
        }
    };

    const heroStats = useMemo(() => {
        if (!meta) {
            return [
                { label: "Active products", value: "-" },
                { label: "Featured", value: "-" },
                { label: "Creators", value: "-" },
                { label: "Total revenue", value: "-" },
            ];
        }

        return [
            { label: "Active products", value: meta.stats.totalProducts.toLocaleString() },
            { label: "Featured", value: meta.stats.featuredCount.toLocaleString() },
            { label: "Creators", value: meta.stats.creatorCount.toLocaleString() },
            { label: "Total revenue", value: formatCurrency(meta.stats.totalRevenue ?? 0) },
        ];
    }, [meta]);

    const typeOptions = meta?.types ?? [];

    return (
        <div className="container mx-auto py-10 space-y-12">
            <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent px-6 py-10 md:px-10">
                <div className="max-w-2xl space-y-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
                        Fundify Market
                    </span>
                    <h1 className="text-3xl md:text-4xl font-bold leading-tight text-foreground">
                        Discover premium creator assets and digital downloads
                    </h1>
                    <p className="text-base text-muted-foreground">
                        Shop curated templates, guides, presets, and more from Fundify creators. Support their work and unlock tools made for builders like you.
                    </p>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                    {isMetaLoading
                        ? Array.from({ length: 4 }).map((_, idx) => (
                              <Skeleton key={idx} className="h-20 rounded-2xl" />
                          ))
                        : heroStats.map((stat) => (
                              <div
                                  key={stat.label}
                                  className="rounded-2xl border border-border/40 bg-background/70 p-4 backdrop-blur-sm"
                              >
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                      {stat.label}
                                  </p>
                                  <p className="mt-2 text-lg font-semibold text-foreground">{stat.value}</p>
                              </div>
                          ))}
                </div>
            </section>

            {isCollectionsLoading ? (
                <div className="space-y-6">
                    <Skeleton className="h-6 w-64" />
                    <div className="flex gap-5 overflow-x-auto pb-2">
                        {Array.from({ length: 3 }).map((_, idx) => (
                            <Skeleton key={idx} className="h-72 w-64 rounded-2xl" />
                        ))}
                    </div>
                </div>
            ) : (
                <ProductCollections collections={collections} onBuy={handleBuy} />
            )}

            <section className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="space-y-6 rounded-2xl border border-border/40 bg-card/40 p-6 backdrop-blur">
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Search
                        </h3>
                        <Input
                            placeholder="Search products..."
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Categories
                        </h3>
                        {isMetaLoading ? (
                            <Skeleton className="h-16 w-full" />
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {typeOptions.map(({ type, count }) => {
                                    const isActive = selectedTypes.includes(type);
                                    return (
                                        <Button
                                            key={type}
                                            type="button"
                                            size="sm"
                                            variant={isActive ? "default" : "outline"}
                                            onClick={() => toggleType(type)}
                                            className="rounded-full"
                                        >
                                            {PRODUCT_TYPE_LABELS[type] ?? type}
                                            <span className="ml-2 text-xs text-muted-foreground">
                                                {count}
                                            </span>
                                        </Button>
                                    );
                                })}
                                {typeOptions.length === 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        No categories yet.
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Price range ($)
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                type="number"
                                min={0}
                                placeholder="Min"
                                value={priceMin}
                                onChange={(event) => setPriceMin(event.target.value)}
                            />
                            <Input
                                type="number"
                                min={0}
                                placeholder="Max"
                                value={priceMax}
                                onChange={(event) => setPriceMax(event.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Featured
                        </h3>
                        <Select value={featuredFilter} onValueChange={(value: "all" | "true" | "false") => setFeaturedFilter(value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by featured" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All products</SelectItem>
                                <SelectItem value="true">Featured only</SelectItem>
                                <SelectItem value="false">Hide featured</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button variant="ghost" type="button" onClick={resetFilters} className="w-full justify-center">
                        Reset filters
                    </Button>
                </aside>

                <main className="space-y-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm text-muted-foreground">
                            {isLoading
                                ? "Loading products..."
                                : products.length === 1
                                    ? "Showing 1 product"
                                    : `Showing ${products.length} products`}
                        </div>
                        <div className="flex items-center gap-3">
                            <Select value={sort} onValueChange={setSort}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="popular">Popular first</SelectItem>
                                    <SelectItem value="new">Newest first</SelectItem>
                                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                                    <SelectItem value="featured">Featured</SelectItem>
                                    <SelectItem value="sales">Best sellers</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" onClick={() => router.push("/purchases")} size="sm">
                                View my purchases
                            </Button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {Array.from({ length: 8 }).map((_, index) => (
                                <Skeleton key={index} className="h-[360px] rounded-2xl" />
                            ))}
                        </div>
                    ) : products.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {products.map((product) => (
                                <ProductCard key={product.id} product={product} onBuy={handleBuy} showCreator />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/40 bg-card/30 p-10 text-center">
                            <div className="text-lg font-semibold text-foreground">No products found</div>
                            <p className="max-w-md text-sm text-muted-foreground">
                                Try adjusting your filters or explore different categories to discover more digital products from our creators.
                            </p>
                            <Button variant="default" onClick={resetFilters}>
                                Clear filters
                            </Button>
                        </div>
                    )}
                </main>
            </section>
        </div>
    );
}
