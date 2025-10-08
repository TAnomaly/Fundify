"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TierCard } from "@/components/TierCard";
import { redirectToCheckout } from "@/lib/stripe";
import { isAuthenticated } from "@/lib/auth";
import toast from "react-hot-toast";
import axios from "axios";

interface Tier {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: "MONTHLY" | "YEARLY";
  perks: string[];
  currentSubscribers: number;
  maxSubscribers?: number;
  isActive: boolean;
}

interface Creator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  creatorBio?: string;
  socialLinks?: any;
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  creator: Creator;
}

export default function CreatorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subscribingTier, setSubscribingTier] = useState<string | null>(null);

  useEffect(() => {
    loadCreatorData();
  }, [username]);

  const loadCreatorData = async () => {
    try {
      setIsLoading(true);

      // Use new dedicated endpoint for creator profiles
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/users/creator/${username}`
      );

      if (response.data.success) {
        const { campaign: creatorCampaign, tiers: creatorTiers } = response.data.data;
        
        if (creatorCampaign) {
          setCampaign(creatorCampaign);
          setTiers(creatorTiers || []);
        } else {
          toast.error("Creator not found");
          router.push("/campaigns");
        }
      }
    } catch (error: any) {
      console.error("Error loading creator:", error);
      if (error.response?.status === 404) {
        toast.error("Creator not found");
      } else {
        toast.error("Failed to load creator profile");
      }
      router.push("/campaigns");
    } finally {
      setIsLoading(false);
    }
  };


  const handleSubscribe = async (tierId: string) => {
    if (!isAuthenticated()) {
      toast.error("Please login to subscribe");
      router.push("/login?redirect=" + window.location.pathname);
      return;
    }

    if (!campaign) return;

    try {
      setSubscribingTier(tierId);
      await redirectToCheckout(tierId, campaign.creator.id);
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast.error(error.message || "Failed to start subscription");
      setSubscribingTier(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Creator Not Found</h1>
          <p className="text-muted-foreground mb-4">
            This creator page doesn't exist
          </p>
          <button
            onClick={() => router.push("/campaigns")}
            className="text-purple-600 hover:underline"
          >
            Browse Campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Hero Section */}
      <div className="relative h-64 bg-gradient-to-r from-purple-600 to-blue-600">
        <img
          src={campaign.coverImage}
          alt={campaign.title}
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="flex justify-center mb-4">
              {campaign.creator.avatar ? (
                <img
                  src={campaign.creator.avatar}
                  alt={campaign.creator.name}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-purple-700 flex items-center justify-center text-4xl font-bold">
                  {campaign.creator.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <h1 className="text-4xl font-bold mb-2">{campaign.creator.name}</h1>
            <p className="text-lg opacity-90">{campaign.title}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-20">
        {/* Bio Card */}
        {campaign.creator.creatorBio && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">About</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {campaign.creator.creatorBio}
            </p>
          </div>
        )}

        {/* Membership Tiers */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Choose Your <span className="text-gradient">Membership Tier</span>
          </h2>

          {tiers.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <p className="text-muted-foreground">
                This creator hasn't set up membership tiers yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tiers.map((tier, index) => (
                <TierCard
                  key={tier.id}
                  tier={tier}
                  isPopular={index === 1 && tiers.length > 2} // Middle tier is popular
                  onSubscribe={handleSubscribe}
                  isLoading={subscribingTier === tier.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-3xl font-bold text-purple-600">
              {tiers.reduce((sum, t) => sum + (t.currentSubscribers || 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Total Subscribers
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">
              {tiers.length}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Membership Tiers
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-3xl font-bold text-green-600">
              ${tiers.length > 0 ? Math.min(...tiers.map((t) => t.price)) : 0}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Starting From
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-3xl font-bold text-orange-600">
              {campaign.creator.socialLinks ? "✓" : "○"}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Verified Creator
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
