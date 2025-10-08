"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import axios from "axios";
import { Search, Users, TrendingUp, Sparkles } from "lucide-react";

interface Creator {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  creatorBio?: string;
  isCreator: boolean;
  _count?: {
    subscriptions: number;
    membershipTiers: number;
  };
  membershipTiers?: Array<{
    id: string;
    price: number;
  }>;
}

const categories = [
  { value: "all", label: "All Creators", icon: "🎨" },
  { value: "art", label: "Art & Design", icon: "🎨" },
  { value: "music", label: "Music", icon: "🎵" },
  { value: "gaming", label: "Gaming", icon: "🎮" },
  { value: "education", label: "Education", icon: "📚" },
  { value: "tech", label: "Technology", icon: "💻" },
  { value: "lifestyle", label: "Lifestyle", icon: "✨" },
];

export default function CreatorsPage() {
  const router = useRouter();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    loadCreators();
  }, []);

  useEffect(() => {
    filterCreators();
  }, [searchQuery, selectedCategory, creators]);

  const loadCreators = async () => {
    try {
      setIsLoading(true);

      // Get all ACTIVE campaigns with type CREATOR
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/campaigns`,
        {
          params: {
            type: 'CREATOR',
            status: 'ACTIVE', // Only show active creator campaigns
            limit: 100,
          },
        }
      );

      if (response.data.success) {
        const campaigns = response.data.data?.campaigns || [];

        // Extract unique creators from ACTIVE campaigns only
        const creatorsMap = new Map();

        campaigns.forEach((campaign: any) => {
          const creator = campaign.creator;
          // Only add creators with active campaigns and isCreator status
          if (
            creator && 
            !creatorsMap.has(creator.id) &&
            campaign.status === 'ACTIVE'
          ) {
            creatorsMap.set(creator.id, {
              id: creator.id,
              name: creator.name,
              username: creator.name.toLowerCase().replace(/\s+/g, '-'),
              email: creator.email,
              avatar: creator.avatar,
              creatorBio: creator.creatorBio || campaign.description,
              isCreator: true,
              _count: {
                subscriptions: 0, // Will be populated by backend
                membershipTiers: 0,
              },
              membershipTiers: [],
            });
          }
        });

        const creatorsArray = Array.from(creatorsMap.values());
        setCreators(creatorsArray);
        setFilteredCreators(creatorsArray);

        // Load tier counts for each creator
        creatorsArray.forEach((creator) => {
          loadCreatorTiers(creator.id);
        });
      }
    } catch (error) {
      console.error("Error loading creators:", error);
      toast.error("Failed to load creators");
    } finally {
      setIsLoading(false);
    }
  };

  const loadCreatorTiers = async (creatorId: string) => {
    try {
      // Find creator's campaign
      const campaignResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/campaigns`
      );

      if (campaignResponse.data.success) {
        const creatorCampaign = campaignResponse.data.data?.campaigns?.find(
          (c: any) => c.creator.id === creatorId && c.type === 'CREATOR'
        );

        if (creatorCampaign) {
          // Get tiers for this campaign
          const tiersResponse = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/memberships/campaigns/${creatorCampaign.id}/tiers`
          );

          if (tiersResponse.data.success) {
            const tiers = tiersResponse.data.data || [];

            // Update creator with tier info
            setCreators((prev) =>
              prev.map((c) =>
                c.id === creatorId
                  ? {
                    ...c,
                    _count: {
                      ...c._count,
                      membershipTiers: tiers.length,
                    },
                    membershipTiers: tiers,
                  }
                  : c
              )
            );

            // Also update filtered creators
            setFilteredCreators((prev) =>
              prev.map((c) =>
                c.id === creatorId
                  ? {
                    ...c,
                    _count: {
                      ...c._count,
                      membershipTiers: tiers.length,
                    },
                    membershipTiers: tiers,
                  }
                  : c
              )
            );
          }
        }
      }
    } catch (error) {
      console.error(`Error loading tiers for creator ${creatorId}:`, error);
    }
  };

  const filterCreators = () => {
    let filtered = [...creators];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (creator) =>
          creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          creator.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          creator.creatorBio?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter (implement based on your category system)
    // For now, showing all creators

    setFilteredCreators(filtered);
  };

  const handleCreatorClick = (creator: Creator) => {
    const username = creator.username || creator.name.toLowerCase().replace(/\s+/g, "-");
    router.push(`/creators/${username}`);
  };

  const getMinPrice = (creator: Creator) => {
    if (!creator.membershipTiers || creator.membershipTiers.length === 0) {
      return null;
    }
    return Math.min(...creator.membershipTiers.map((t) => t.price));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-semibold">Discover Amazing Creators</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Support Your Favorite <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-pink-200">
                Creators
              </span>
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Browse talented creators, subscribe to exclusive content, and become part of their creative journey
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search creators by name or bio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg rounded-2xl bg-white/95 backdrop-blur-sm border-0 shadow-xl focus:ring-4 focus:ring-white/20"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-6 py-3 rounded-full text-sm font-semibold transition-all shadow-md hover:shadow-lg ${selectedCategory === category.value
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white scale-105"
                    : "bg-white text-gray-700 hover:scale-105"
                  }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <div className="text-3xl font-bold">{creators.length}</div>
                <div className="text-sm opacity-90">Active Creators</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-7 h-7" />
              </div>
              <div>
                <div className="text-3xl font-bold">{filteredCreators.length}</div>
                <div className="text-sm opacity-90">Matching Results</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 shadow-xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <div className="text-3xl font-bold">
                  {creators.reduce((sum, c) => sum + (c._count?.subscriptions || 0), 0)}
                </div>
                <div className="text-sm opacity-90">Total Subscribers</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Creators Grid */}
        {filteredCreators.length === 0 ? (
          <Card className="shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No Creators Found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? `No creators match "${searchQuery}"`
                  : "No creators available at the moment"}
              </p>
              {searchQuery && (
                <Button onClick={() => setSearchQuery("")} variant="outline">
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCreators.map((creator) => {
              const minPrice = getMinPrice(creator);
              const username = creator.username || creator.name.toLowerCase().replace(/\s+/g, "-");

              return (
                <Card
                  key={creator.id}
                  className="group cursor-pointer hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden border-0 shadow-xl"
                  onClick={() => handleCreatorClick(creator)}
                >
                  {/* Creator Avatar/Header */}
                  <div className="relative h-40 bg-gradient-to-br from-purple-400 via-blue-400 to-teal-400">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                      {creator.avatar ? (
                        <img
                          src={creator.avatar}
                          alt={creator.name}
                          className="w-24 h-24 rounded-full border-4 border-white shadow-xl object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl bg-white flex items-center justify-center text-4xl font-bold text-purple-600">
                          {creator.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  <CardContent className="pt-16 pb-6 px-6">
                    <h3 className="text-2xl font-bold text-center mb-2 group-hover:text-purple-600 transition-colors">
                      {creator.name}
                    </h3>

                    <p className="text-sm text-center text-muted-foreground mb-4">
                      @{username}
                    </p>

                    {creator.creatorBio && (
                      <p className="text-sm text-center text-muted-foreground mb-4 line-clamp-2">
                        {creator.creatorBio}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {creator._count?.subscriptions || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Subscribers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {creator._count?.membershipTiers || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Tiers</div>
                      </div>
                    </div>

                    {/* Price & CTA */}
                    <div className="text-center">
                      {minPrice !== null && (
                        <div className="text-sm text-muted-foreground mb-3">
                          Starting from <span className="text-lg font-bold text-green-600">${minPrice}/mo</span>
                        </div>
                      )}
                      <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg">
                        View Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* CTA Section */}
        {filteredCreators.length > 0 && (
          <div className="mt-16 text-center">
            <Card className="bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 text-white border-0 shadow-2xl">
              <CardContent className="p-12">
                <h2 className="text-3xl font-bold mb-4">Want to Become a Creator?</h2>
                <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
                  Share your passion, build a community, and earn from your content with our creator program
                </p>
                <Button
                  size="lg"
                  className="bg-white text-purple-600 hover:bg-gray-100 shadow-xl text-lg px-8"
                  onClick={() => router.push("/creator-dashboard")}
                >
                  Start Creating
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

