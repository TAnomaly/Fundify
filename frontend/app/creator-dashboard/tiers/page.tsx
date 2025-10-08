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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTier, setNewTier] = useState({
    name: "",
    description: "",
    price: "",
    interval: "MONTHLY" as "MONTHLY" | "YEARLY",
    perks: [""],
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/login");
        return;
      }

      // Get current user's creator campaign
      const userResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const userData = await userResponse.json();

      if (!userData.success || !userData.data.isCreator) {
        toast.error("You must be a creator to manage tiers");
        router.push("/creator-dashboard");
        return;
      }

      // Get creator's campaign
      const campaignsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/campaigns?type=CREATOR`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const campaignsData = await campaignsResponse.json();

      const creatorCampaign = campaignsData.data?.campaigns?.find(
        (c: any) => c.creatorId === userData.data.id && c.type === "CREATOR"
      );

      if (!creatorCampaign) {
        toast.error("Creator campaign not found");
        setTiers([]);
        setIsLoading(false);
        return;
      }

      // Get tiers for the campaign
      const tiersResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/memberships/campaigns/${creatorCampaign.id}/tiers`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const tiersData = await tiersResponse.json();

      if (tiersData.success) {
        setTiers(tiersData.data.map((t: any) => ({
          ...t,
          currentSubscribers: t._count?.subscriptions || 0
        })));
      } else {
        setTiers([]);
      }
    } catch (error) {
      console.error("Error loading tiers:", error);
      toast.error("Failed to load tiers");
      setTiers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Please login");
        return;
      }

      // Get current user's creator campaign
      const userResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const userData = await userResponse.json();

      // Get creator campaign
      const campaignsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/campaigns?type=CREATOR`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const campaignsData = await campaignsResponse.json();

      const creatorCampaign = campaignsData.data?.campaigns?.find(
        (c: any) => c.creatorId === userData.data.id && c.type === "CREATOR"
      );

      if (!creatorCampaign) {
        toast.error("Creator campaign not found");
        return;
      }

      // Create tier
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/memberships/campaigns/${creatorCampaign.id}/tiers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: newTier.name,
            description: newTier.description,
            price: parseFloat(newTier.price),
            interval: newTier.interval,
            perks: newTier.perks.filter((p) => p.trim() !== ""),
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Tier created successfully!");
        setShowCreateForm(false);
        setNewTier({
          name: "",
          description: "",
          price: "",
          interval: "MONTHLY",
          perks: [""],
        });
        loadTiers();
      } else {
        toast.error(data.message || "Failed to create tier");
      }
    } catch (error) {
      console.error("Error creating tier:", error);
      toast.error("Failed to create tier");
    } finally {
      setIsCreating(false);
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
            onClick={() => setShowCreateForm(true)}
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
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-primary text-white hover:opacity-90"
            >
              Create Your First Tier
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Tier Modal/Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white dark:bg-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Create New Tier</span>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTier} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tier Name</label>
                  <input
                    type="text"
                    value={newTier.name}
                    onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Bronze, Silver, Gold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={newTier.description}
                    onChange={(e) => setNewTier({ ...newTier, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Describe what subscribers get..."
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={newTier.price}
                      onChange={(e) => setNewTier({ ...newTier, price: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="9.99"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Billing Interval</label>
                    <select
                      value={newTier.interval}
                      onChange={(e) => setNewTier({ ...newTier, interval: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Perks</label>
                  {newTier.perks.map((perk, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={perk}
                        onChange={(e) => {
                          const newPerks = [...newTier.perks];
                          newPerks[index] = e.target.value;
                          setNewTier({ ...newTier, perks: newPerks });
                        }}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter a perk..."
                        required
                      />
                      {newTier.perks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewTier({
                              ...newTier,
                              perks: newTier.perks.filter((_, i) => i !== index),
                            });
                          }}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewTier({ ...newTier, perks: [...newTier.perks, ""] })}
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                  >
                    + Add Perk
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 bg-gradient-primary text-white hover:opacity-90"
                  >
                    {isCreating ? "Creating..." : "Create Tier"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    disabled={isCreating}
                    className="bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
