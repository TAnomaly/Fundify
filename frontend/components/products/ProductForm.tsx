"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { digitalProductsApi, type DigitalProduct } from "@/lib/api/digitalProducts";
import toast from "react-hot-toast";

interface ProductFormProps {
    initial?: Partial<DigitalProduct>;
    onSaved?: (product: DigitalProduct) => void;
}

export default function ProductForm({ initial, onSaved }: ProductFormProps) {
    const [form, setForm] = useState<Partial<DigitalProduct>>({
        title: initial?.title || "",
        description: initial?.description || "",
        price: initial?.price || 0,
        productType: initial?.productType || "EBOOK",
        coverImage: initial?.coverImage || "",
        fileUrl: initial?.fileUrl || "",
        previewUrl: initial?.previewUrl || "",
        features: initial?.features || [],
        requirements: initial?.requirements || [],
        isActive: initial?.isActive ?? true,
        isFeatured: initial?.isFeatured ?? false,
    });
    const [saving, setSaving] = useState(false);

    const handleChange = (field: keyof DigitalProduct, value: any) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            let resp;
            if (initial?.id) {
                resp = await digitalProductsApi.update(initial.id, form);
            } else {
                resp = await digitalProductsApi.create(form);
            }
            if (resp.success) {
                toast.success("Product saved");
                onSaved?.(resp.data as any);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to save product");
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className="space-y-4" onSubmit={onSubmit}>
            <div>
                <Label>Title</Label>
                <Input value={form.title as string} onChange={(e) => handleChange("title", e.target.value)} required />
            </div>
            <div>
                <Label>Description</Label>
                <Textarea value={form.description as string} onChange={(e) => handleChange("description", e.target.value)} rows={4} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <Label>Price (USD)</Label>
                    <Input type="number" min={0} step={0.01} value={form.price as number} onChange={(e) => handleChange("price", Number(e.target.value))} required />
                </div>
                <div>
                    <Label>Type</Label>
                    <Input value={form.productType as string} onChange={(e) => handleChange("productType", e.target.value)} />
                </div>
                <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!form.isActive} onChange={(e) => handleChange("isActive", e.target.checked)} />
                        Active
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!form.isFeatured} onChange={(e) => handleChange("isFeatured", e.target.checked)} />
                        Featured
                    </label>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>Cover Image URL</Label>
                    <Input value={form.coverImage as string} onChange={(e) => handleChange("coverImage", e.target.value)} />
                </div>
                <div>
                    <Label>Preview URL (optional)</Label>
                    <Input value={form.previewUrl as string} onChange={(e) => handleChange("previewUrl", e.target.value)} />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>File URL</Label>
                    <Input value={form.fileUrl as string} onChange={(e) => handleChange("fileUrl", e.target.value)} />
                </div>
                <div>
                    <Label>Features (comma separated)</Label>
                    <Input value={(form.features || []).join(", ")} onChange={(e) => handleChange("features", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} />
                </div>
            </div>
            <div>
                <Label>Requirements (comma separated)</Label>
                <Input value={(form.requirements || []).join(", ")} onChange={(e) => handleChange("requirements", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} />
            </div>
            <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : initial?.id ? "Update Product" : "Create Product"}
            </Button>
        </form>
    );
}
