"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isAuthenticated } from "@/lib/auth";

export default function NewEventPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        title: "",
        description: "",
        type: "VIRTUAL" as "VIRTUAL" | "IN_PERSON" | "HYBRID",
        startTime: "",
        endTime: "",
        location: "",
        price: 0,
    });

    const onSubmit = async () => {
        if (!isAuthenticated()) return toast.error("Please login");
        if (!form.title || !form.startTime || !form.endTime) return toast.error("Fill required fields");
        try {
            setIsSubmitting(true);
            const token = localStorage.getItem("authToken");
            const api = process.env.NEXT_PUBLIC_API_URL;
            
            // Convert datetime-local to ISO-8601 format
            const eventData = {
                ...form,
                startTime: new Date(form.startTime).toISOString(),
                endTime: new Date(form.endTime).toISOString(),
            };
            
            const res = await axios.post(`${api}/events`, eventData, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data?.success) {
                toast.success("Event created");
                router.push(`/creator-dashboard/events`);
            } else {
                toast.error("Failed to create event");
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Error creating event");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <h1 className="text-3xl font-bold mb-6">Create New Event</h1>
            <div className="space-y-4">
                <input className="w-full p-3 rounded border bg-background" placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                <textarea className="w-full p-3 rounded border bg-background" placeholder="Description (HTML allowed)" rows={6} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select className="w-full p-3 rounded border bg-background" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}>
                        <option value="VIRTUAL">Virtual</option>
                        <option value="IN_PERSON">In Person</option>
                        <option value="HYBRID">Hybrid</option>
                    </select>
                    <input className="w-full p-3 rounded border bg-background" placeholder="Location (if in-person)" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="datetime-local" className="w-full p-3 rounded border bg-background" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                    <input type="datetime-local" className="w-full p-3 rounded border bg-background" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="number" className="w-full p-3 rounded border bg-background" placeholder="Price (0 for free)" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
                </div>
                <div className="flex gap-3">
                    <Button onClick={onSubmit} disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create Event"}</Button>
                    <Button variant="outline" onClick={() => router.push("/creator-dashboard/events")}>Cancel</Button>
                </div>
            </div>
        </div>
    );
}


