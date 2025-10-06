"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveToken } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (token) {
      saveToken(token);
      router.push("/dashboard");
    } else if (error) {
      router.push("/login?error=" + error);
    } else {
      router.push("/login");
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}
