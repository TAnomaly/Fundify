"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { subscriptionApi } from "@/lib/api/subscription";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import type { Subscription } from "@/types/subscription";

export default function SubscriptionsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    setIsLoading(true);
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        router.push("/login");
        return;
      }

      const response = await subscriptionApi.getMySubscriptions();
      if (response.success) {
        setSubscriptions(response.data || []);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load subscriptions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (subscriptionId: string) => {
    if (!confirm("Are you sure you want to cancel this subscription? You'll have access until the end of your billing period.")) {
      return;
    }

    try {
      const response = await subscriptionApi.cancelSubscription(subscriptionId);
      if (response.success) {
        toast.success(response.message || "Subscription cancelled successfully");
        loadSubscriptions();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to cancel subscription");
    }
  };

  const handleTogglePause = async (subscriptionId: string) => {
    try {
      const response = await subscriptionApi.togglePause(subscriptionId);
      if (response.success) {
        toast.success(response.message || "Subscription updated");
        loadSubscriptions();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update subscription");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-gradient">My Subscriptions</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your creator memberships</p>
      </div>

      {subscriptions.length > 0 ? (
        <div className="space-y-6">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="bg-glass-card rounded-2xl p-6 shadow-soft">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {sub.creator.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">{sub.creator.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{sub.tier.name}</p>
                  </div>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  sub.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' :
                  sub.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                  sub.status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {sub.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Price</p>
                  <p className="font-semibold text-lg">
                    ${sub.tier.price}/{sub.tier.interval === 'MONTHLY' ? 'mo' : 'yr'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Next Billing</p>
                  <p className="font-semibold">
                    {new Date(sub.nextBillingDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Perks */}
              {sub.tier.perks && sub.tier.perks.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Membership Perks:</p>
                  <div className="space-y-2">
                    {sub.tier.perks.map((perk, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/creator/${sub.creator.id}`)}
                  className="flex-1 px-4 py-2 bg-gradient-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  View Creator
                </button>

                {sub.status === 'ACTIVE' && (
                  <>
                    <button
                      onClick={() => handleTogglePause(sub.id)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Pause
                    </button>
                    <button
                      onClick={() => handleCancel(sub.id)}
                      className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}

                {sub.status === 'PAUSED' && (
                  <button
                    onClick={() => handleTogglePause(sub.id)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Resume
                  </button>
                )}

                {sub.status === 'CANCELLED' && sub.endDate && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 self-center">
                    Access until {new Date(sub.endDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-glass-card rounded-3xl p-12 text-center shadow-soft">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto mb-6 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">No Active Subscriptions</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Support your favorite creators with monthly memberships
          </p>
          <button
            onClick={() => router.push("/campaigns?type=CREATOR")}
            className="px-8 py-3 bg-gradient-primary text-white rounded-full font-semibold hover:opacity-90 transition-opacity"
          >
            Discover Creators
          </button>
        </div>
      )}
    </div>
  );
}
