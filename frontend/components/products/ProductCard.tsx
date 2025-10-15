"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMediaBaseUrl } from "@/lib/api";
import type { DigitalProduct } from "@/lib/api/digitalProducts";

interface ProductCardProps {
    product: DigitalProduct;
    onBuy?: (product: DigitalProduct) => void;
}

export default function ProductCard({ product, onBuy }: ProductCardProps) {
    const mediaBase = getMediaBaseUrl();
    const imageSrc = product.coverImage
        ? `${mediaBase}${product.coverImage.startsWith("/") ? "" : "/"}${product.coverImage}`
        : "/placeholder.png";

    return (
        <Card className="overflow-hidden group">
            <div className="relative h-48 overflow-hidden">
                <img
                    src={imageSrc}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {product.isFeatured && (
                    <div className="absolute top-3 left-3">
                        <Badge className="bg-purple-600">Featured</Badge>
                    </div>
                )}
            </div>
            <CardHeader className="p-4 pb-0">
                <CardTitle className="text-lg line-clamp-1">{product.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {product.description}
                </p>
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <div className="font-semibold">{product.price ? `$${product.price.toFixed(2)}` : 'Free'}</div>
                        <div className="text-xs text-muted-foreground">
                            {product.salesCount} sold
                        </div>
                    </div>
                    <Button onClick={() => onBuy?.(product)} size="sm">
                        Buy
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
