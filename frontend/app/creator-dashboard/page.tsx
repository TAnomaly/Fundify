"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { subscriptionApi } from "@/lib/api/subscription";
import { creatorPostApi } from "@/lib/api/creatorPost";
import { userApi } from "@/lib/api";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import type { Subscription, CreatorPost } from "@/types/subscription";

export default function CreatorDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [subscribers, setSubscribers] = useState<Subscription[]>([]);
  const [posts, setPosts] = useState<CreatorPost[]>([]);
  const [stats, setStats] = useState({ totalSubscribers: 0, monthlyRevenue: 0 });
  const [isCreator, setIsCreator] = useState(false);
  const [userName, setUserName] = useState<string>("");

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        router.push("/login");
        return;
      }

      // Check if user is a creator
      const userResponse = await userApi.getMe();
      if (userResponse.success && userResponse.data) {
        setIsCreator(userResponse.data.isCreator || false);
        setUserName(userResponse.data.username || "");

        if (!userResponse.data.isCreator) {
          // Not a creator yet
          setIsLoading(false);
          return;
        }
      }

      // Load creator data
      const [subscribersRes, postsRes] = await Promise.allSettled([
        subscriptionApi.getMySubscribers(),
        creatorPostApi.getMyPosts(),
      ]);

      if (subscribersRes.status === "fulfilled" && subscribersRes.value.success) {
        setSubscribers(subscribersRes.value.data.subscriptions || []);
        setStats(subscribersRes.value.data.stats || { totalSubscribers: 0, monthlyRevenue: 0 });
      }

      if (postsRes.status === "fulfilled" && postsRes.value.success) {
        setPosts(postsRes.value.data || []);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load creator dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadDashboard();

    const handleStorageChange = () => {
      console.log("📡 Storage changed, reloading dashboard...");
      loadDashboard();
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [loadDashboard]);
  const becomeCreator = async () => {
    try {
      const response = await userApi.becomeCreator();
      if (response.success) {
        toast.success("Welcome to the creator program!");
        setIsCreator(true);
        loadDashboard();
      } else {
        toast.error(response.message || "Failed to become a creator");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to become a creator");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!isCreator) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-12 text-center shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Monokai gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#F92672]/5 via-[#AE81FF]/5 to-[#66D9EF]/5 -z-10" />

          <div className="mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-[#F92672] via-[#AE81FF] to-[#66D9EF] rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg animate-pulse">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
          </div>

          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#F92672] via-[#AE81FF] to-[#66D9EF] bg-clip-text text-transparent">Become a Creator</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg max-w-2xl mx-auto">
            Start earning from your supporters with recurring memberships, exclusive content, and direct community support.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-transparent hover:border-[#A6E22E] transition-all hover:shadow-lg hover:scale-105">
              <div className="text-5xl mb-4">💰</div>
              <h3 className="font-semibold mb-2 text-lg">Recurring Income</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Monthly or yearly subscriptions from your supporters</p>
            </div>
            <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-transparent hover:border-[#E6DB74] transition-all hover:shadow-lg hover:scale-105">
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="font-semibold mb-2 text-lg">Exclusive Content</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Share posts and updates only for your members</p>
            </div>
            <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-transparent hover:border-[#66D9EF] transition-all hover:shadow-lg hover:scale-105">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="font-semibold mb-2 text-lg">Analytics</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Track your growth and earnings in real-time</p>
            </div>
          </div>

          <button
            onClick={becomeCreator}
            className="btn-monokai-pink px-8 py-4 text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            Start Creating
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-[#F92672] via-[#AE81FF] to-[#66D9EF] bg-clip-text text-transparent">
          {userName ? `Welcome back, ${userName}! 👋` : "Creator Dashboard"}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">Manage your supporters and content</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="relative group bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-all overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#66D9EF]/5 to-[#AE81FF]/5 -z-10" />
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 dark:text-gray-400 font-medium">Total Supporters</h3>
            <div className="w-10 h-10 bg-gradient-to-br from-[#66D9EF] to-[#AE81FF] rounded-full flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-bold bg-gradient-to-r from-[#66D9EF] to-[#AE81FF] bg-clip-text text-transparent">{stats.totalSubscribers}</p>
        </div>

        <div className="relative group bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-all overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#A6E22E]/5 to-[#E6DB74]/5 -z-10" />
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 dark:text-gray-400 font-medium">Monthly Revenue</h3>
            <div className="w-10 h-10 bg-gradient-to-br from-[#A6E22E] to-[#E6DB74] rounded-full flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-bold bg-gradient-to-r from-[#A6E22E] to-[#E6DB74] bg-clip-text text-transparent">${stats.monthlyRevenue.toFixed(2)}</p>
        </div>

        <div className="relative group bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-all overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#F92672]/5 to-[#FD971F]/5 -z-10" />
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 dark:text-gray-400 font-medium">Posts Published</h3>
            <div className="w-10 h-10 bg-gradient-to-br from-[#F92672] to-[#FD971F] rounded-full flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-bold bg-gradient-to-r from-[#F92672] to-[#FD971F] bg-clip-text text-transparent">{posts.length}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <button
          onClick={() => router.push("/creator-dashboard/new-post")}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#F92672] to-[#FD971F] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Create New Post</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Share updates with your supporters</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/creator-dashboard/blog")}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#AE81FF] to-[#F92672] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Blog Articles</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Write & manage blog posts</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/creator-dashboard/events")}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#FD971F] to-[#E6DB74] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Events</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Schedule & host events</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/creator-dashboard/polls")}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#AE81FF] to-[#66D9EF] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Polls</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Create & manage polls</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/creator-dashboard/goals")}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#A6E22E] to-[#66D9EF] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Goals</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Track revenue & milestones</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/creator-dashboard/profile")}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#FD971F] to-[#F92672] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Edit Profile</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Update your info & branding</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/creator-dashboard/analytics")}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#66D9EF] to-[#AE81FF] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">View Analytics</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Track your growth and revenue</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/creator-dashboard/tiers")}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#F92672] to-[#AE81FF] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Manage Tiers</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Edit membership levels and perks</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/creator-dashboard/widgets")}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#A6E22E] to-[#E6DB74] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Stream Widgets</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">OBS alerts & integrations</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/creator-dashboard/referrals")}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#66D9EF] to-[#F92672] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 8a3 3 0 11-6 0 3 3 0 016 0zM6 8a3 3 0 11-6 0 3 3 0 016 0zm12 8a3 3 0 11-6 0 3 3 0 016 0zm-6 0a3 3 0 11-6 0 3 3 0 016 0zm0 0l3-4m-9 4l3-4m-3-4l3 4m0-4l3 4"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Referral Program</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Reward supporters who bring friends</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/creator-dashboard/posts")}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#66D9EF] to-[#A6E22E] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">All Posts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">View all your posts</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/creator-dashboard/subscribers")}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#F92672] to-[#FD971F] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Subscribers</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage your supporters</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/creator-dashboard/scheduled-posts")}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#FD971F] to-[#F92672] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Scheduled Posts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Schedule content for later</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/creator-dashboard/welcome-messages")}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#E6DB74] to-[#A6E22E] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Welcome Messages</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Auto-welcome new subscribers</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/creator-dashboard/podcasts")}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#F92672] to-[#AE81FF] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Podcasts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage podcast episodes</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/creator-dashboard/products")}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#66D9EF] to-[#A6E22E] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 1v6l3-3 3 3V1" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Digital Products</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Create and sell digital products</p>
            </div>
          </div>
        </button>
      </div>

      {/* Recent Supporters */}
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
        <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-[#F92672] to-[#AE81FF] bg-clip-text text-transparent">Recent Supporters</h2>
        {subscribers.length > 0 ? (
          <div className="space-y-4">
            {subscribers.slice(0, 5).map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#66D9EF] to-[#AE81FF] rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                    {sub.subscriber.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{sub.subscriber.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{sub.tier.name} • ${sub.tier.price}/{sub.tier.interval.toLowerCase()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${sub.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' :
                    sub.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                    {sub.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No supporters yet. Share your creator page to get started!</p>
          </div>
        )}
      </div>

      {/* Recent Posts */}
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-[#A6E22E] to-[#E6DB74] bg-clip-text text-transparent">Recent Posts</h2>
          <button
            onClick={() => router.push("/creator-dashboard/posts")}
            className="text-sm font-semibold bg-gradient-to-r from-[#66D9EF] to-[#AE81FF] bg-clip-text text-transparent hover:opacity-80 transition-opacity"
          >
            View All →
          </button>
        </div>
        {posts.length > 0 ? (
          <div className="space-y-4">
            {posts.slice(0, 3).map((post) => (
              <div key={post.id} className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{post.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${post.isPublic ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                    'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                    }`}>
                    {post.isPublic ? 'Public' : 'Members Only'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{post.excerpt || post.content}</p>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {post.likeCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {post.commentCount}
                  </span>
                  <span className="ml-auto">{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No posts yet. Create your first post to engage with supporters!</p>
          </div>
        )}
      </div>
    </div>
  );
}
