"use client";

import Image from "next/image";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
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
        <CardContainer containerClassName="w-full h-full">
            <CardBody className="bg-glass-card relative group/card w-full h-full rounded-xl p-6 border-2 border-monokai-grey/20 hover:shadow-soft-hover">
                <CardItem
                    translateZ="50"
                    className="text-xl font-bold text-gradient mb-2"
                >
                    {product.title}
                </CardItem>
                <CardItem
                    as="p"
                    translateZ="60"
                    className="text-sm max-w-sm mt-2 text-monokai-fg/70 line-clamp-2"
                >
                    {product.description}
                </CardItem>
                <CardItem translateZ="80" className="w-full mt-4">
                    <div className="relative w-full h-48 rounded-xl overflow-hidden">
                        <Image
                            src={imageSrc}
                            alt={product.title}
                            fill
                            className="object-cover group-hover/card:shadow-xl transition-transform duration-500 group-hover/card:scale-110"
                        />
                    </div>
                </CardItem>
                <div className="flex justify-between items-center mt-12">
                    <CardItem
                        translateZ={20}
                        className="text-2xl font-bold text-monokai-green"
                    >
                        {product.price ? `$${product.price.toFixed(2)}` : 'Free'}
                    </CardItem>
                    <CardItem
                        translateZ={40}
                        as={Button}
                        onClick={() => onBuy?.(product)}
                        className="btn-monokai-green text-lg"
                    >
                        Buy Now
                    </CardItem>
                </div>
            </CardBody>
        </CardContainer>
    );
}
