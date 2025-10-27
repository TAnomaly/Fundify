"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Star } from "lucide-react";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { getFullMediaUrl } from "@/lib/utils/mediaUrl";
import type { DigitalProduct } from "@/lib/api/digitalProducts";

interface ProductCardProps {
    product: DigitalProduct;
    onBuy?: (product: DigitalProduct) => void;
    className?: string;
    showCreator?: boolean;
}

const typeLabels: Record<string, string> = {
    EBOOK: "E-book",
    COURSE: "Course",
    TEMPLATE: "Template",
    AUDIO: "Audio",
    VIDEO: "Video",
    SOFTWARE: "Software",
    ASSET: "Asset",
    OTHER: "Digital",
};

export default function ProductCard({ product, onBuy, className, showCreator = true }: ProductCardProps) {
    const imageSrc = getFullMediaUrl(product.coverImage) || "/placeholder.png";
    const productType = product.productType ? typeLabels[product.productType] ?? product.productType : "Digital";
    const hasStats = (product.salesCount ?? 0) > 0 || product._count?.purchases;
    const salesCount = product.salesCount ?? product._count?.purchases ?? 0;
    const salesLabel = salesCount > 0 ? `${salesCount}+ sold` : "Be the first";
    const isAvailable = product.isActive !== false;

    return (
        <CardContainer
            containerClassName={cn("w-full h-full !py-0", className)}
            className="w-full"
        >
            <CardBody className="bg-card/40 group/card dark:bg-card/50 backdrop-blur-sm relative w-full !h-full !w-full rounded-xl p-5 border border-border/20 shadow-elegant transition-all duration-300 hover:shadow-elegant-md">
                <div className="absolute top-5 left-5 flex gap-2">
                    <Badge variant={product.isFeatured ? "default" : "secondary"} className="text-xs">
                        {productType}
                    </Badge>
                    {product.isFeatured && (
                        <Badge variant="outline" className="text-xs gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-500" />
                            Featured
                        </Badge>
                    )}
                </div>
                <CardItem
                    translateZ={50}
                    className="w-full h-44 relative rounded-lg overflow-hidden mb-4"
                >
                    <Image
                        src={imageSrc}
                        alt={product.name}
                        fill
                        className="object-cover group-hover/card:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        priority={false}
                    />
                </CardItem>

                <div className="space-y-2">
                    <CardItem
                        translateZ={30}
                        className="text-lg font-semibold text-foreground line-clamp-2"
                    >
                        {product.name}
                    </CardItem>

                    {product.description && (
                        <CardItem
                            as="p"
                            translateZ={40}
                            className="text-sm text-muted-foreground line-clamp-2"
                        >
                            {product.description}
                        </CardItem>
                    )}

                    {showCreator && product.creator && (
                        <CardItem
                            translateZ={20}
                            className="text-xs text-muted-foreground"
                        >
                            by{" "}
                            <span className="font-medium text-foreground">
                                {product.creator.name || product.creator.username || "Creator"}
                            </span>
                        </CardItem>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{salesLabel}</span>
                        {product._count?.purchases && product._count.purchases > salesCount ? (
                            <span>{product._count.purchases} downloads</span>
                        ) : null}
                    </div>
                </div>

                <div className="mt-5 flex items-end justify-between gap-2">
                    <CardItem translateZ={20} className="text-xl font-bold text-primary">
                        {formatCurrency(product.price ?? 0)}
                    </CardItem>
                    <div className="flex gap-2">
                        <CardItem translateZ={45} as={Link} href={`/products/${product.id}`}>
                            <Button variant="outline" size="sm">
                                View details
                            </Button>
                        </CardItem>
                        {onBuy && (
                            <CardItem translateZ={60}>
                                <Button
                                    size="sm"
                                    disabled={!isAvailable}
                                    onClick={() => onBuy(product)}
                                    className="gap-1"
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    {isAvailable ? "Buy now" : "Unavailable"}
                                </Button>
                            </CardItem>
                        )}
                    </div>
                </div>
            </CardBody>
        </CardContainer>
    );
}
