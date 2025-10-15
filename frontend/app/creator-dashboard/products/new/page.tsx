"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProductForm from "@/components/products/ProductForm";

export default function NewProductPage() {
    const router = useRouter();
    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle>Create Product</CardTitle>
                </CardHeader>
                <CardContent>
                    <ProductForm onSaved={(p) => router.push(`/creator-dashboard/products`)} />
                </CardContent>
            </Card>
        </div>
    );
}
