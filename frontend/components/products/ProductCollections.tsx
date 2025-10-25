"use client";

import type { DigitalProduct, ProductCollections } from "@/lib/api/digitalProducts";
import ProductCard from "./ProductCard";
import { cn } from "@/lib/utils";

interface ProductCollectionsProps {
    collections: ProductCollections | null;
    onBuy?: (product: DigitalProduct) => void;
    className?: string;
}

const SECTION_CONFIG = [
    {
        key: "featured" as const,
        title: "Featured drops",
        description: "Hand-picked releases curated by the Fundify team.",
        emptyLabel: "No featured products yet.",
    },
    {
        key: "topSelling" as const,
        title: "Trending now",
        description: "Popular products creators are loving this week.",
        emptyLabel: "No trending products yet.",
    },
    {
        key: "newArrivals" as const,
        title: "Fresh uploads",
        description: "The latest releases from our creator community.",
        emptyLabel: "No recent products yet.",
    },
];

export default function ProductCollections({ collections, onBuy, className }: ProductCollectionsProps) {
    if (!collections) {
        return null;
    }

    const hasAny = SECTION_CONFIG.some(({ key }) => collections[key]?.length);
    if (!hasAny) {
        return null;
    }

    return (
        <div className={cn("space-y-12", className)}>
            {SECTION_CONFIG.map(({ key, title, description, emptyLabel }) => {
                const products = collections[key] ?? [];

                return (
                    <section key={key} className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                                <p className="text-sm text-muted-foreground">{description}</p>
                            </div>
                        </div>
                        {products.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border/40 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
                                {emptyLabel}
                            </div>
                        ) : (
                            <div className="flex gap-5 overflow-x-auto pb-2">
                                {products.map(product => (
                                    <div key={product.id} className="min-w-[260px] max-w-[280px] flex-shrink-0">
                                        <ProductCard product={product} onBuy={onBuy} showCreator />
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                );
            })}
        </div>
    );
}
