"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated()) {
        router.push("/login");
        return;
      }

      const user = getCurrentUser();
      if (user?.username) {
        // Redirect to the user's profile page
        router.push(`/creators/${user.username}`);
      } else {
        // If no username, redirect to profile setup
        router.push("/creator-dashboard/profile");
      }
    };

    checkAuth();
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return null; // Will redirect
}
