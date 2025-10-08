"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Tier {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: "MONTHLY" | "YEARLY";
  perks: string[];
  currentSubscribers: number;
  isActive: boolean;
}

export default function TiersPage() {
  const router = useRouter();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement API call to fetch tiers
      toast.info("Tiers management coming soon!");
      setTiers([]);
    } catch (error) {
      toast.error("Failed to load tiers");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-gradient">Membership Tiers</h1>
            <p className="text-gray-600 dark:text-gray-400">Create and manage your subscription tiers</p>
          </div>
          <Button
            onClick={() => toast.info("Create tier feature coming soon!")}
            className="bg-gradient-primary text-white hover:opacity-90"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Tier
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : tiers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <Card key={tier.id} className="bg-glass-card shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{tier.name}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    tier.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {tier.isActive ? 'Active' : 'Inactive'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="text-3xl font-bold">${tier.price}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    per {tier.interval.toLowerCase()}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{tier.description}</p>
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">Perks:</div>
                  <ul className="space-y-1">
                    {tier.perks.slice(0, 3).map((perk, idx) => (
                      <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {tier.currentSubscribers} subscriber{tier.currentSubscribers !== 1 ? 's' : ''}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-glass-card shadow-soft">
          <CardContent className="py-12 text-center">
            <div className="w-24 h-24 bg-gradient-primary rounded-full mx-auto flex items-center justify-center mb-6 opacity-20">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">No Tiers Yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Create your first membership tier to start offering exclusive content and perks to your supporters.
            </p>
            <Button
              onClick={() => toast.info("Create tier feature coming soon!")}
              className="bg-gradient-primary text-white hover:opacity-90"
            >
              Create Your First Tier
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
