"use client";

import Image from "next/image";
import Link from "next/link";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import { Button } from "@/components/ui/button";
import { getFullMediaUrl } from "@/lib/utils/mediaUrl";
import type { DigitalProduct } from "@/lib/api/digitalProducts";
import { ShoppingCart } from "lucide-react";

interface ProductCardProps {
    product: DigitalProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
    const imageSrc = getFullMediaUrl(product.coverImage) || "/placeholder.png";

    return (
        <CardContainer containerClassName="w-full h-full">
            <CardBody className="bg-card/50 group/card dark:bg-card/80 backdrop-blur-sm relative w-full h-full rounded-xl p-5 border border-border/30">
                <CardItem
                    translateZ="50"
                    className="w-full h-48 relative rounded-lg overflow-hidden mb-4"
                >
                    <Image
                        src={imageSrc}
                        alt={product.title}
                        fill
                        className="object-cover group-hover/card:scale-105 transition-transform duration-500"
                    />
                </CardItem>

                <CardItem
                    translateZ="30"
                    className="text-lg font-bold text-foreground truncate"
                >
                    {product.title}
                </CardItem>

                <CardItem
                    as="p"
                    translateZ="40"
                    className="text-sm text-muted-foreground mt-1 h-10 line-clamp-2"
                >
                    {product.description}
                </CardItem>

                <div className="flex justify-between items-end mt-4">
                    <CardItem
                        translateZ={20}
                        className="text-xl font-bold text-primary"
                    >
                        {product.price ? `$${product.price.toFixed(2)}` : 'Free'}
                    </CardItem>
                    <CardItem
                        translateZ={50}
                        as={Link}
                        href={`/products/${product.id}`}
                    >
                         <Button variant="default" size="sm">
                            <ShoppingCart className="w-4 h-4 mr-2"/>
                            View
                        </Button>
                    </CardItem>
                </div>
            </CardBody>
        </CardContainer>
    );
}