"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignCard } from "@/components/ui/card";
import toast from "react-hot-toast";
import axios from "axios";
import {
  TrendingUp,
  Flame,
  Star,
  Users,
  Zap,
  Award,
  Clock,
  Heart
} from "lucide-react";

interface Creator {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatar?: string;
  bannerImage?: string;
  creatorBio?: string;
  isCreator: boolean;
  _count?: {
    subscribers: number;
    posts: number;
  };
}

interface Campaign {
  id: string;
  title: string;
  slug: string;
  description: string;
  goal: number;
  currentAmount: number;
  category: string;
  imageUrl: string;
  endDate: string;
  backers?: number;
  featured?: boolean;
}

export default function ExplorePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [trendingCreators, setTrendingCreators] = useState<Creator[]>([]);
  const [featuredCampaigns, setFeaturedCampaigns] = useState<Campaign[]>([]);
  const [selectedTab, setSelectedTab] = useState<'trending' | 'featured' | 'new'>('trending');

  useEffect(() => {
    loadExploreData();
  }, []);

  const loadExploreData = async () => {
    setIsLoading(true);
    try {
      // Load trending creators
      const creatorsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/users/creators`
      );

      if (creatorsResponse.data.success) {
        const creators = creatorsResponse.data.data || [];
        // Sort by subscriber count
        const sorted = creators
          .filter((c: Creator) => c._count && c._count.subscribers > 0)
          .sort((a: Creator, b: Creator) =>
            (b._count?.subscribers || 0) - (a._count?.subscribers || 0)
          )
          .slice(0, 6);
        setTrendingCreators(sorted);
      }

      // Load featured campaigns
      const campaignsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/campaigns`
      );

      if (campaignsResponse.data.success) {
        const data = campaignsResponse.data.data as any;
        const campaigns = Array.isArray(data) ? data : data.campaigns || [];

        // Filter and sort campaigns
        const featured = campaigns
          .filter((c: Campaign) => c.currentAmount > 0)
          .sort((a: Campaign, b: Campaign) => b.currentAmount - a.currentAmount)
          .slice(0, 6);

        setFeaturedCampaigns(featured);
      }
    } catch (error) {
      console.error("Failed to load explore data:", error);
      toast.error("Failed to load content");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50 dark:from-[#1E1E1E] dark:via-[#272822] dark:to-[#2D2A2E] py-12">
        <div className="container mx-auto px-4">
          <Skeleton className="h-16 w-96 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50 dark:from-[#1E1E1E] dark:via-[#272822] dark:to-[#2D2A2E]">
      {/* Hero Section */}
      <div className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F92672] via-[#AE81FF] to-[#66D9EF]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

        <div className="container mx-auto px-4 relative">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-12 h-12 text-white animate-pulse" />
            <h1 className="text-6xl font-bold text-white drop-shadow-lg">
              Discover Amazing Projects
            </h1>
          </div>
          <p className="text-xl text-white/95 max-w-3xl">
            Explore trending creators, featured campaigns, and innovative projects from our community
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 overflow-x-auto">
          <button
            onClick={() => setSelectedTab('trending')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all whitespace-nowrap ${
              selectedTab === 'trending'
                ? 'bg-gradient-to-r from-[#F92672] to-[#FD971F] text-white shadow-lg scale-105'
                : 'bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700 hover:border-[#F92672] hover:scale-105'
            }`}
          >
            <Flame className="w-5 h-5" />
            Trending Now
          </button>
          <button
            onClick={() => setSelectedTab('featured')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all whitespace-nowrap ${
              selectedTab === 'featured'
                ? 'bg-gradient-to-r from-[#A6E22E] to-[#E6DB74] text-white shadow-lg scale-105'
                : 'bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700 hover:border-[#A6E22E] hover:scale-105'
            }`}
          >
            <Star className="w-5 h-5" />
            Featured Campaigns
          </button>
          <button
            onClick={() => setSelectedTab('new')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all whitespace-nowrap ${
              selectedTab === 'new'
                ? 'bg-gradient-to-r from-[#66D9EF] to-[#AE81FF] text-white shadow-lg scale-105'
                : 'bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700 hover:border-[#66D9EF] hover:scale-105'
            }`}
          >
            <Clock className="w-5 h-5" />
            New & Rising
          </button>
        </div>

        {/* Trending Creators Section */}
        {selectedTab === 'trending' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-8 h-8 text-[#F92672]" />
              <h2 className="text-4xl font-bold bg-gradient-to-r from-[#F92672] to-[#FD971F] bg-clip-text text-transparent">
                Trending Creators
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {trendingCreators.map((creator) => (
                <Card
                  key={creator.id}
                  className="group relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer overflow-hidden"
                  onClick={() => router.push(`/creator/${creator.username || creator.id}`)}
                >
                  {/* Banner */}
                  <div className="h-32 bg-gradient-to-br from-[#F92672] via-[#AE81FF] to-[#66D9EF] relative">
                    {creator.bannerImage && (
                      <img
                        src={creator.bannerImage}
                        alt=""
                        className="w-full h-full object-cover opacity-70"
                      />
                    )}
                    <div className="absolute top-3 right-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1">
                      <Flame className="w-4 h-4 text-[#F92672]" />
                      <span className="text-sm font-semibold">Trending</span>
                    </div>
                  </div>

                  {/* Avatar */}
                  <div className="relative px-6 -mt-12">
                    <div className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-800 bg-gradient-to-br from-[#F92672] to-[#AE81FF] flex items-center justify-center text-white font-bold text-2xl shadow-lg overflow-hidden">
                      {creator.avatar ? (
                        <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
                      ) : (
                        creator.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>

                  <CardContent className="pt-4">
                    <h3 className="text-xl font-bold mb-1">{creator.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      @{creator.username || `user${creator.id.slice(0, 6)}`}
                    </p>

                    {creator.creatorBio && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {creator.creatorBio}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#66D9EF]" />
                        <span className="font-semibold">{creator._count?.subscribers || 0}</span>
                        <span className="text-gray-600 dark:text-gray-400">supporters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-[#F92672]" />
                        <span className="font-semibold">{creator._count?.posts || 0}</span>
                        <span className="text-gray-600 dark:text-gray-400">posts</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {trendingCreators.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No trending creators yet. Be the first!</p>
              </div>
            )}
          </div>
        )}

        {/* Featured Campaigns Section */}
        {selectedTab === 'featured' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Award className="w-8 h-8 text-[#A6E22E]" />
              <h2 className="text-4xl font-bold bg-gradient-to-r from-[#A6E22E] to-[#E6DB74] bg-clip-text text-transparent">
                Featured Campaigns
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  title={campaign.title}
                  description={campaign.description}
                  imageUrl={campaign.imageUrl}
                  goal={campaign.goal}
                  currentAmount={campaign.currentAmount}
                  category={campaign.category}
                  daysRemaining={Math.max(Math.ceil((new Date(campaign.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)), 0)}
                  backers={campaign.backers || 0}
                  slug={campaign.slug}
                />
              ))}
            </div>

            {featuredCampaigns.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No featured campaigns yet. Check back soon!</p>
              </div>
            )}
          </div>
        )}

        {/* New & Rising Section */}
        {selectedTab === 'new' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-8 h-8 text-[#66D9EF]" />
              <h2 className="text-4xl font-bold bg-gradient-to-r from-[#66D9EF] to-[#AE81FF] bg-clip-text text-transparent">
                New & Rising Stars
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingCreators.slice(0, 3).map((creator) => (
                <Card
                  key={creator.id}
                  className="group relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
                  onClick={() => router.push(`/creator/${creator.username || creator.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#66D9EF] to-[#AE81FF] flex items-center justify-center text-white font-bold text-xl overflow-hidden">
                        {creator.avatar ? (
                          <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
                        ) : (
                          creator.name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold">{creator.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          @{creator.username || `user${creator.id.slice(0, 6)}`}
                        </p>
                      </div>
                      <div className="bg-[#66D9EF]/10 p-2 rounded-full">
                        <Zap className="w-5 h-5 text-[#66D9EF]" />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold bg-gradient-to-r from-[#66D9EF] to-[#AE81FF] bg-clip-text text-transparent">
                          {creator._count?.subscribers || 0}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">supporters</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold bg-gradient-to-r from-[#F92672] to-[#FD971F] bg-clip-text text-transparent">
                          {creator._count?.posts || 0}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">posts</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
