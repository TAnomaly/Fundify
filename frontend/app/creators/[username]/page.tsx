"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TierCard } from "@/components/TierCard";
import { redirectToCheckout } from "@/lib/stripe";
import { isAuthenticated } from "@/lib/auth";
import toast from "react-hot-toast";
import { Users, Heart, Calendar } from "lucide-react";

export default function CreatorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Load creator profile
    setIsLoading(false);
  }, [username]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold">Creator Profile: {username}</h1>
        <p className="mt-4">Coming soon - Full Patreon-style profile!</p>
      </div>
    </div>
  );
}